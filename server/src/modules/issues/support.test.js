import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import request from 'supertest';

import app from '../../app.js';
import User from '../users/user.model.js';
import Settings from '../wallet/settings.model.js';
import Wallet from '../wallet/wallet.model.js';
import WalletTxn from '../wallet/walletTxn.model.js';
import { chargeWallet, ensureDefaultSettings, ensureWallet } from '../wallet/wallet.service.js';
import Issue from './issue.model.js';
import IssueSupport from './issueSupport.model.js';
import { transitionIssue } from './issue.service.js';
import { createTokenPayload, generateAccessToken } from '../../utils/jwt.util.js';

let replSet;

const makeUser = async (overrides = {}) => {
  const user = await User.create({
    name: 'Test Citizen',
    email: `u${Date.now()}${Math.random().toString(36).slice(2)}@test.local`,
    password: 'Password@123',
    phone: `9${String(Math.floor(Math.random() * 1e9)).padStart(9, '0')}`,
    ...overrides,
  });
  return user;
};

const tokenFor = (user) => generateAccessToken(createTokenPayload(user));

// Coordinates spread far apart by default; duplicate tests pin them explicitly.
const issueBody = (overrides = {}) => ({
  title: 'Broken streetlight on MG Road',
  description: 'The streetlight outside number 42 has been dead for two weeks, making the lane unsafe at night.',
  category: 'STREETLIGHT',
  location: {
    coordinates: [77.5946 + (Math.random() - 0.5) * 0.4, 12.9716 + (Math.random() - 0.5) * 0.4],
    address: '42 MG Road',
    city: 'Bengaluru',
    state: 'Karnataka',
    pincode: '560001',
  },
  idempotencyKey: `report:${Math.random().toString(36).slice(2)}`,
  ...overrides,
});

const bodyAt = (coordinates, overrides = {}) =>
  issueBody({
    location: { ...issueBody().location, coordinates },
    ...overrides,
  });

// Funds via real ledger rows so sum(txns) === balance always holds.
const makeFundedCitizen = async (balancePaise = 15000, overrides = {}) => {
  const user = await makeUser(overrides);
  await ensureWallet(user._id); // SIGNUP_CREDIT +5000
  const delta = balancePaise - 5000;
  if (delta > 0) {
    await chargeWallet({
      userId: user._id,
      type: 'TOPUP',
      amountPaise: delta,
      idempotencyKey: `seed-topup:${user._id}`,
    });
  } else if (delta < 0) {
    await chargeWallet({
      userId: user._id,
      type: 'REPORT_FEE',
      amountPaise: delta,
      idempotencyKey: `seed-adjust:${user._id}`,
    });
  }
  return user;
};

const reportIssue = async (user, body) => {
  const res = await request(app)
    .post('/api/issues')
    .set('Authorization', `Bearer ${tokenFor(user)}`)
    .send(body);
  expect(res.status).toBe(201);
  return res.body.data.issue;
};

const supportReq = (user, issueId, idempotencyKey) =>
  request(app)
    .post(`/api/issues/${issueId}/support`)
    .set('Authorization', `Bearer ${tokenFor(user)}`)
    .send({ idempotencyKey });

const key = () => `support:${Math.random().toString(36).slice(2)}`;

beforeAll(async () => {
  replSet = await MongoMemoryReplSet.create({ replSet: { count: 1, storageEngine: 'wiredTiger' } });
  await mongoose.connect(replSet.getUri());
  await Issue.init();
  await ensureDefaultSettings();
}, 300_000);

afterAll(async () => {
  await mongoose.disconnect();
  await replSet?.stop();
});

describe('Duplicate detection — POST /api/issues', () => {
  it('same category within radius → 409 DUPLICATE_FOUND with existingIssue, nothing charged', async () => {
    const reporter = await makeFundedCitizen();
    const original = await reportIssue(reporter, bodyAt([77.6, 12.9]));

    const other = await makeFundedCitizen();
    const before = await Issue.countDocuments();
    // ~0.0005° ≈ 55 m on each axis → well inside 100 m.
    const res = await request(app)
      .post('/api/issues')
      .set('Authorization', `Bearer ${tokenFor(other)}`)
      .send(bodyAt([77.6005, 12.9005]));

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('DUPLICATE_FOUND');
    const existing = res.body.error.existingIssue;
    expect(String(existing._id)).toBe(String(original._id));
    expect(existing.category).toBe('PUBLIC_FACILITIES');
    expect(existing.fundPaise).toBe(500);
    expect(existing.supporterCount).toBe(1);
    expect(Number.isInteger(existing.distanceM)).toBe(true);
    expect(existing.distanceM).toBeLessThan(100);
    expect(existing.hasSupported).toBe(false);
    expect(existing.isReporter).toBe(false);
    expect(existing.canSupport).toBe(true);

    expect(await Issue.countDocuments()).toBe(before);
    expect((await Wallet.findOne({ userId: other._id })).balancePaise).toBe(15000);
    expect(await WalletTxn.countDocuments({ userId: other._id, type: 'REPORT_FEE' })).toBe(0);
  });

  it('~170 m away → allowed', async () => {
    const a = await makeFundedCitizen();
    await reportIssue(a, bodyAt([77.62, 12.92]));
    const b = await makeFundedCitizen();
    // 0.0015° latitude ≈ 166 m > 100 m radius.
    const res = await request(app)
      .post('/api/issues')
      .set('Authorization', `Bearer ${tokenFor(b)}`)
      .send(bodyAt([77.62, 12.9215]));
    expect(res.status).toBe(201);
  });

  it('different category at the same spot → allowed', async () => {
    const a = await makeFundedCitizen();
    await reportIssue(a, bodyAt([77.64, 12.94]));
    const b = await makeFundedCitizen();
    const res = await request(app)
      .post('/api/issues')
      .set('Authorization', `Bearer ${tokenFor(b)}`)
      .send(bodyAt([77.64, 12.94], { category: 'GARBAGE' }));
    expect(res.status).toBe(201);
  });

  it('CLOSED, REJECTED and older-than-duplicateDays issues do not block', async () => {
    const admin = await makeUser({ role: 'ADMIN' });
    const actor = { userId: admin._id.toString(), role: 'ADMIN' };
    const a = await makeFundedCitizen();

    const closed = await reportIssue(a, bodyAt([77.66, 12.96]));
    await transitionIssue(closed._id, 'ACKNOWLEDGED', actor);
    await transitionIssue(closed._id, 'IN_PROGRESS', actor);
    await transitionIssue(closed._id, 'RESOLVED', actor);
    await transitionIssue(closed._id, 'CLOSED', actor);

    const rejected = await reportIssue(a, bodyAt([77.67, 12.97]));
    await transitionIssue(rejected._id, 'REJECTED', actor, 'spam');

    const old = await reportIssue(a, bodyAt([77.68, 12.98]));
    // Native driver: Mongoose treats createdAt as immutable and strips $set.
    await Issue.collection.updateOne(
      { _id: new mongoose.Types.ObjectId(old._id) },
      { $set: { createdAt: new Date(Date.now() - 31 * 24 * 60 * 60 * 1000) } },
    );

    const b = await makeFundedCitizen(45000);
    for (const coords of [[77.66, 12.96], [77.67, 12.97], [77.68, 12.98]]) {
      const res = await request(app)
        .post('/api/issues')
        .set('Authorization', `Bearer ${tokenFor(b)}`)
        .send(bodyAt(coords));
      expect(res.status, `${coords}: ${JSON.stringify(res.body.error)}`).toBe(201);
    }
  });

  it('force:true creates even when a duplicate exists', async () => {
    const a = await makeFundedCitizen();
    await reportIssue(a, bodyAt([77.7, 13.0]));
    const b = await makeFundedCitizen();
    const res = await request(app)
      .post('/api/issues')
      .set('Authorization', `Bearer ${tokenFor(b)}`)
      .send(bodyAt([77.7, 13.0], { force: true }));
    expect(res.status).toBe(201);
  });

  it('replay of a successful report is NOT blocked by its own issue', async () => {
    const a = await makeFundedCitizen();
    const body = bodyAt([77.72, 13.02]);
    const first = await request(app)
      .post('/api/issues')
      .set('Authorization', `Bearer ${tokenFor(a)}`)
      .send(body);
    expect(first.status).toBe(201);

    const replay = await request(app)
      .post('/api/issues')
      .set('Authorization', `Bearer ${tokenFor(a)}`)
      .send(body);
    expect(replay.status).toBe(200);
    expect(replay.body.data.issue._id).toBe(first.body.data.issue._id);
  });

  it('changing settings.duplicateRadiusM changes the result', async () => {
    const a = await makeFundedCitizen();
    await reportIssue(a, bodyAt([77.74, 13.04]));

    const b = await makeFundedCitizen();
    await Settings.updateOne({ key: 'duplicateRadiusM' }, { $set: { value: 50 } });
    // ~78 m away: inside the default 100 m radius, outside the new 50 m one.
    const res = await request(app)
      .post('/api/issues')
      .set('Authorization', `Bearer ${tokenFor(b)}`)
      .send(bodyAt([77.7405, 13.0405]));
    expect(res.status).toBe(201);
    await Settings.updateOne({ key: 'duplicateRadiusM' }, { $set: { value: 100 } });
  });
});

describe('Paid +1 support — POST /api/issues/:issueId/support', () => {
  it('happy path: fund +fee, supporterCount +1, SUPPORT_FEE txn, balance -fee', async () => {
    const reporter = await makeFundedCitizen();
    const issue = await reportIssue(reporter, issueBody());
    const supporter = await makeFundedCitizen();

    const res = await supportReq(supporter, issue._id, key());
    expect(res.status).toBe(201);
    expect(res.body.data.idempotent).toBe(false);
    expect(res.body.data.issue).toMatchObject({ fundPaise: 600, supporterCount: 2 });
    expect(res.body.data.wallet.balancePaise).toBe(14900);
    expect(res.body.data.support).toMatchObject({ amountPaise: 100, isReporter: false });

    const txn = await WalletTxn.findOne({ userId: supporter._id, type: 'SUPPORT_FEE' });
    expect(txn.amountPaise).toBe(-100);
    expect(String(txn.issueId)).toBe(String(issue._id));
    expect((await Wallet.findOne({ userId: supporter._id })).balancePaise).toBe(14900);
  });

  it('honours supportFeePaise changed in settings', async () => {
    await Settings.updateOne({ key: 'supportFeePaise' }, { $set: { value: 200 } });
    const reporter = await makeFundedCitizen();
    const issue = await reportIssue(reporter, issueBody());
    const supporter = await makeFundedCitizen();
    const res = await supportReq(supporter, issue._id, key());
    expect(res.status).toBe(201);
    expect(res.body.data.issue.fundPaise).toBe(700);
    expect(res.body.data.wallet.balancePaise).toBe(14800);
    await Settings.updateOne({ key: 'supportFeePaise' }, { $set: { value: 100 } });
  });

  it('insufficient balance → 409 and nothing is created or changed', async () => {
    const reporter = await makeFundedCitizen();
    const issue = await reportIssue(reporter, issueBody());
    const poor = await makeFundedCitizen(50);

    const res = await supportReq(poor, issue._id, key());
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('INSUFFICIENT_BALANCE');
    expect((await Wallet.findOne({ userId: poor._id })).balancePaise).toBe(50);
    expect(await IssueSupport.countDocuments({ issueId: issue._id })).toBe(1);
    expect(await WalletTxn.countDocuments({ userId: poor._id, type: 'SUPPORT_FEE' })).toBe(0);
    expect((await Issue.findById(issue._id)).fundPaise).toBe(500);
  });

  it('reporter and existing supporter cannot support again → 409, no charge', async () => {
    const reporter = await makeFundedCitizen();
    const issue = await reportIssue(reporter, issueBody());

    const reporterRes = await supportReq(reporter, issue._id, key());
    expect(reporterRes.status).toBe(409);
    expect(reporterRes.body.error.code).toBe('ALREADY_SUPPORTED');

    const supporter = await makeFundedCitizen();
    expect((await supportReq(supporter, issue._id, key())).status).toBe(201);
    const again = await supportReq(supporter, issue._id, key());
    expect(again.status).toBe(409);
    expect(again.body.error.code).toBe('ALREADY_SUPPORTED');
    expect((await Wallet.findOne({ userId: supporter._id })).balancePaise).toBe(14900);
    expect((await Issue.findById(issue._id)).fundPaise).toBe(600);
  });

  it('unsupportable statuses → 409 ISSUE_NOT_SUPPORTABLE', async () => {
    const reporter = await makeFundedCitizen();
    const issue = await reportIssue(reporter, issueBody());
    await transitionIssue(issue._id, 'RESOLVED', { userId: reporter._id.toString(), role: 'CITIZEN' });

    const supporter = await makeFundedCitizen();
    const res = await supportReq(supporter, issue._id, key());
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('ISSUE_NOT_SUPPORTABLE');
  });

  it('replay with the same key → 200 idempotent, exactly one charge', async () => {
    const reporter = await makeFundedCitizen();
    const issue = await reportIssue(reporter, issueBody());
    const supporter = await makeFundedCitizen();
    const k = key();

    const first = await supportReq(supporter, issue._id, k);
    expect(first.status).toBe(201);
    const replay = await supportReq(supporter, issue._id, k);
    expect(replay.status).toBe(200);
    expect(replay.body.data.idempotent).toBe(true);
    expect(replay.body.data.issue.fundPaise).toBe(600);

    expect(await WalletTxn.countDocuments({ idempotencyKey: k })).toBe(1);
    expect((await Wallet.findOne({ userId: supporter._id })).balancePaise).toBe(14900);
  });

  it('key reused by another user → 409 IDEMPOTENCY_KEY_CONFLICT', async () => {
    const reporter = await makeFundedCitizen();
    const issue = await reportIssue(reporter, issueBody());
    const a = await makeFundedCitizen();
    const b = await makeFundedCitizen();
    const k = key();

    expect((await supportReq(a, issue._id, k)).status).toBe(201);
    const res = await supportReq(b, issue._id, k);
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('IDEMPOTENCY_KEY_CONFLICT');
    expect((await Wallet.findOne({ userId: b._id })).balancePaise).toBe(15000);
  });

  it('same user double-tap concurrently, SAME key → exactly one charge', async () => {
    const reporter = await makeFundedCitizen();
    const issue = await reportIssue(reporter, issueBody());
    const supporter = await makeFundedCitizen();
    const k = key();

    const results = await Promise.all([supportReq(supporter, issue._id, k), supportReq(supporter, issue._id, k)]);
    const statuses = results.map((r) => r.status).sort();
    expect(statuses).toEqual([200, 201]);
    expect(await WalletTxn.countDocuments({ userId: supporter._id, type: 'SUPPORT_FEE' })).toBe(1);
    expect((await Wallet.findOne({ userId: supporter._id })).balancePaise).toBe(14900);
    expect((await Issue.findById(issue._id)).fundPaise).toBe(600);
    expect(await IssueSupport.countDocuments({ issueId: issue._id })).toBe(2);
  });

  it('same user double-tap concurrently, DIFFERENT keys → exactly one charge', async () => {
    const reporter = await makeFundedCitizen();
    const issue = await reportIssue(reporter, issueBody());
    const supporter = await makeFundedCitizen();

    const results = await Promise.all([
      supportReq(supporter, issue._id, key()),
      supportReq(supporter, issue._id, key()),
    ]);
    const statuses = results.map((r) => r.status).sort();
    expect(statuses.filter((s) => s === 201)).toHaveLength(1);
    expect(statuses.every((s) => [200, 201, 409].includes(s))).toBe(true);
    expect(await WalletTxn.countDocuments({ userId: supporter._id, type: 'SUPPORT_FEE' })).toBe(1);
    expect((await Wallet.findOne({ userId: supporter._id })).balancePaise).toBe(14900);
    expect((await Issue.findById(issue._id)).fundPaise).toBe(600);
  });

  it('10 different users supporting concurrently → fund = reportFee + 10 × supportFee', async () => {
    const reporter = await makeFundedCitizen();
    const issue = await reportIssue(reporter, issueBody());
    const supporters = await Promise.all(Array.from({ length: 10 }, () => makeFundedCitizen()));

    const results = await Promise.all(supporters.map((u) => supportReq(u, issue._id, key())));
    expect(results.every((r) => r.status === 201)).toBe(true);

    const updated = await Issue.findById(issue._id);
    expect(updated.fundPaise).toBe(500 + 10 * 100);
    expect(updated.supporterCount).toBe(11);
    expect(await WalletTxn.countDocuments({ issueId: issue._id, type: 'SUPPORT_FEE' })).toBe(10);
    expect(await IssueSupport.countDocuments({ issueId: issue._id })).toBe(11);
  });

  it('rejection after supports refunds the reporter AND every supporter, zeroes the fund', async () => {
    const admin = await makeUser({ role: 'ADMIN' });
    const reporter = await makeFundedCitizen();
    const issue = await reportIssue(reporter, issueBody());
    const a = await makeFundedCitizen();
    const b = await makeFundedCitizen();
    expect((await supportReq(a, issue._id, key())).status).toBe(201);
    expect((await supportReq(b, issue._id, key())).status).toBe(201);

    await transitionIssue(issue._id, 'REJECTED', { userId: admin._id.toString(), role: 'ADMIN' }, 'spam');

    expect((await Issue.findById(issue._id)).fundPaise).toBe(0);
    // Balances back to the funded starting point (15000) for everyone.
    for (const u of [reporter, a, b]) {
      expect((await Wallet.findOne({ userId: u._id })).balancePaise).toBe(15000);
      expect(await WalletTxn.countDocuments({ userId: u._id, type: 'REFUND', issueId: issue._id })).toBe(1);
    }

    // Re-rejecting is a terminal state → no double refund possible.
    await expect(
      transitionIssue(issue._id, 'REJECTED', { userId: admin._id.toString(), role: 'ADMIN' }),
    ).rejects.toMatchObject({ code: 'INVALID_TRANSITION' });
  });
});

describe('Phase 4 read endpoints', () => {
  it('route order: /meta, /mine, /mine/supported are not swallowed by /:issueId', async () => {
    const meta = await request(app).get('/api/issues/meta');
    expect(meta.status).toBe(200);
    expect(meta.body.data.supportFeePaise).toBe(100);
    expect(meta.body.data.thresholds).toEqual({ tier1Paise: 20000, tier2Paise: 50000 });
    expect(meta.body.data.reportFeePaise).toBe(500);

    // Without auth these must 401 (UNAUTHORIZED), not 400 from the issueId regex.
    const mine = await request(app).get('/api/issues/mine');
    expect(mine.status).toBe(401);
    expect(mine.body.error.code).toBe('UNAUTHORIZED');
    const supported = await request(app).get('/api/issues/mine/supported');
    expect(supported.status).toBe(401);
    expect(supported.body.error.code).toBe('UNAUTHORIZED');
  });

  it('/mine is scoped to the caller and includes REJECTED issues', async () => {
    const admin = await makeUser({ role: 'ADMIN' });
    const a = await makeFundedCitizen();
    const b = await makeFundedCitizen();
    const kept = await reportIssue(a, issueBody());
    const rejected = await reportIssue(a, issueBody());
    await transitionIssue(rejected._id, 'REJECTED', { userId: admin._id.toString(), role: 'ADMIN' }, 'spam');
    await reportIssue(b, issueBody());

    const res = await request(app)
      .get('/api/issues/mine')
      .set('Authorization', `Bearer ${tokenFor(a)}`);
    expect(res.status).toBe(200);
    const ids = res.body.data.issues.map((i) => i._id);
    expect(ids).toContain(kept._id);
    expect(ids).toContain(rejected._id);
    expect(res.body.data.issues).toHaveLength(2);
  });

  it('/mine/supported returns amountPaise + supportedAt, scoped to the caller', async () => {
    const reporter = await makeFundedCitizen();
    const issue = await reportIssue(reporter, issueBody());
    const supporter = await makeFundedCitizen();
    await supportReq(supporter, issue._id, key());

    const res = await request(app)
      .get('/api/issues/mine/supported')
      .set('Authorization', `Bearer ${tokenFor(supporter)}`);
    expect(res.status).toBe(200);
    expect(res.body.data.supported).toHaveLength(1);
    const row = res.body.data.supported[0];
    expect(row.issue._id).toBe(issue._id);
    expect(row.amountPaise).toBe(100);
    expect(row.supportedAt).toBeTruthy();
    expect(row.isReporter).toBe(false);

    const other = await makeFundedCitizen();
    const otherRes = await request(app)
      .get('/api/issues/mine/supported')
      .set('Authorization', `Bearer ${tokenFor(other)}`);
    expect(otherRes.body.data.supported).toHaveLength(0);
  });

  it('supporters list shows "FirstName L." only — never email or phone; REJECTED visibility respected', async () => {
    const admin = await makeUser({ role: 'ADMIN' });
    const reporter = await makeFundedCitizen(15000, { name: 'Asha Verma' });
    const issue = await reportIssue(reporter, issueBody());
    const supporter = await makeFundedCitizen(15000, { name: 'Ravi Kumar Singh' });
    await supportReq(supporter, issue._id, key());

    const res = await request(app).get(`/api/issues/${issue._id}/supporters`);
    expect(res.status).toBe(200);
    const raw = JSON.stringify(res.body);
    expect(raw).not.toContain(reporter.email);
    expect(raw).not.toContain(reporter.phone);
    expect(raw).not.toContain(supporter.email);
    expect(raw).not.toContain(supporter.phone);
    const names = res.body.data.supporters.map((s) => s.displayName);
    expect(names).toContain('Asha V.');
    expect(names).toContain('Ravi S.');
    expect(res.body.data.supporters.some((s) => s.isReporter)).toBe(true);

    await transitionIssue(issue._id, 'REJECTED', { userId: admin._id.toString(), role: 'ADMIN' }, 'spam');
    const hidden = await request(app).get(`/api/issues/${issue._id}/supporters`);
    expect(hidden.status).toBe(404);
    const visibleToReporter = await request(app)
      .get(`/api/issues/${issue._id}/supporters`)
      .set('Authorization', `Bearer ${tokenFor(reporter)}`);
    expect(visibleToReporter.status).toBe(200);
  });

  it('detail viewer.canSupport reflects auth, status and prior support', async () => {
    const reporter = await makeFundedCitizen();
    const issue = await reportIssue(reporter, issueBody());
    const supporter = await makeFundedCitizen();

    const anon = await request(app).get(`/api/issues/${issue._id}`);
    expect(anon.body.data.viewer.canSupport).toBe(false);
    const fresh = await request(app)
      .get(`/api/issues/${issue._id}`)
      .set('Authorization', `Bearer ${tokenFor(supporter)}`);
    expect(fresh.body.data.viewer.canSupport).toBe(true);
    const reporterView = await request(app)
      .get(`/api/issues/${issue._id}`)
      .set('Authorization', `Bearer ${tokenFor(reporter)}`);
    expect(reporterView.body.data.viewer.canSupport).toBe(false);

    await supportReq(supporter, issue._id, key());
    const after = await request(app)
      .get(`/api/issues/${issue._id}`)
      .set('Authorization', `Bearer ${tokenFor(supporter)}`);
    expect(after.body.data.viewer.canSupport).toBe(false);
    expect(after.body.data.viewer.hasSupported).toBe(true);
  });
});

describe('Ledger invariant', () => {
  it('for every user: sum(walletTxns.amountPaise) === wallets.balancePaise', async () => {
    const sums = await WalletTxn.aggregate([
      { $group: { _id: '$userId', total: { $sum: '$amountPaise' } } },
    ]);
    expect(sums.length).toBeGreaterThan(0);
    for (const row of sums) {
      const wallet = await Wallet.findOne({ userId: row._id });
      expect(wallet).toBeTruthy();
      expect(wallet.balancePaise).toBe(row.total);
      expect(wallet.balancePaise).toBeGreaterThanOrEqual(0);
    }
  });
});