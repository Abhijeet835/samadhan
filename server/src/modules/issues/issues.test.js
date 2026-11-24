import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import request from 'supertest';

import app from '../../app.js';
import User from '../users/user.model.js';
import Settings from '../wallet/settings.model.js';
import Wallet from '../wallet/wallet.model.js';
import WalletTxn from '../wallet/walletTxn.model.js';
import { ensureDefaultSettings, ensureWallet } from '../wallet/wallet.service.js';
import Issue from './issue.model.js';
import IssueSupport from './issueSupport.model.js';
import IssueUpdate from './issueUpdate.model.js';
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

const issueBody = (overrides = {}) => ({
  title: 'Broken streetlight on MG Road',
  description: 'The streetlight outside number 42 has been dead for two weeks, making the lane unsafe at night.',
  category: 'STREETLIGHT',
  location: {
    // Spread reports kilometres apart so Phase 4 duplicate detection never
    // blocks unrelated tests; duplicate tests set explicit coordinates.
    coordinates: [77.5946 + (Math.random() - 0.5) * 0.4, 12.9716 + (Math.random() - 0.5) * 0.4],
    address: '42 MG Road',
    city: 'Bengaluru',
    state: 'Karnataka',
    pincode: '560001',
  },
  idempotencyKey: `report:${Math.random().toString(36).slice(2)}`,
  ...overrides,
});

/** Creates a citizen with a topped-up wallet (default balance 5000 + 10000). */
const makeFundedCitizen = async (balancePaise = 15000) => {
  const user = await makeUser();
  await ensureWallet(user._id); // 5000
  await Wallet.updateOne({ userId: user._id }, { $set: { balancePaise } });
  return user;
};

beforeAll(async () => {
  replSet = await MongoMemoryReplSet.create({ replSet: { count: 1, storageEngine: 'wiredTiger' } });
  await mongoose.connect(replSet.getUri());
  await ensureDefaultSettings();
});

afterAll(async () => {
  await mongoose.disconnect();
  await replSet?.stop();
});

describe('POST /api/issues — atomic paid report', () => {
  it('debits the fee from settings, creates issue + reporter support + timeline + ledger row', async () => {
    const user = await makeFundedCitizen();
    const res = await request(app)
      .post('/api/issues')
      .set('Authorization', `Bearer ${tokenFor(user)}`)
      .send(issueBody());

    expect(res.status).toBe(201);
    const issueId = res.body.data.issue._id;
    expect(res.body.data.issue).toMatchObject({ status: 'ACTIVE', tier: 0, fundPaise: 500, supporterCount: 1 });

    const wallet = await Wallet.findOne({ userId: user._id });
    expect(wallet.balancePaise).toBe(14500); // 15000 - 500 (fee from settings)

    const txn = await WalletTxn.findOne({ issueId, type: 'REPORT_FEE' });
    expect(txn.amountPaise).toBe(-500);

    const support = await IssueSupport.findOne({ issueId, userId: user._id });
    expect(support).toMatchObject({ amountPaise: 500, isReporter: true });

    const updates = await IssueUpdate.find({ issueId });
    expect(updates).toHaveLength(1);
    expect(updates[0]).toMatchObject({ fromStatus: null, toStatus: 'ACTIVE' });
  });

  it('reads the report fee from the settings collection, not hardcoded', async () => {
    await Settings.updateOne({ key: 'reportFeePaise' }, { $set: { value: 700 } });
    const user = await makeFundedCitizen();
    const res = await request(app)
      .post('/api/issues')
      .set('Authorization', `Bearer ${tokenFor(user)}`)
      .send(issueBody());
    expect(res.status).toBe(201);
    expect(res.body.data.issue.fundPaise).toBe(700);

    const wallet = await Wallet.findOne({ userId: user._id });
    expect(wallet.balancePaise).toBe(14300);
    await Settings.updateOne({ key: 'reportFeePaise' }, { $set: { value: 500 } });
  });

  it('fails with 409 INSUFFICIENT_BALANCE and creates nothing', async () => {
    const user = await makeUser();
    await ensureWallet(user._id);
    await Wallet.updateOne({ userId: user._id }, { $set: { balancePaise: 400 } });

    const before = await Issue.countDocuments();
    const res = await request(app)
      .post('/api/issues')
      .set('Authorization', `Bearer ${tokenFor(user)}`)
      .send(issueBody());

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('INSUFFICIENT_BALANCE');
    expect(await Issue.countDocuments()).toBe(before);
    expect(await Wallet.findOne({ userId: user._id })).toMatchObject({ balancePaise: 400 });
  });

  it('replays the same idempotencyKey without charging twice', async () => {
    const user = await makeFundedCitizen();
    const token = tokenFor(user);
    const body = issueBody();

    const first = await request(app).post('/api/issues').set('Authorization', `Bearer ${token}`).send(body);
    const second = await request(app).post('/api/issues').set('Authorization', `Bearer ${token}`).send(body);

    expect(first.status).toBe(201);
    expect(second.status).toBe(200);
    expect(second.body.data.issue._id).toBe(first.body.data.issue._id);
    expect(await Wallet.findOne({ userId: user._id })).toMatchObject({ balancePaise: 14500 });
    expect(await Issue.countDocuments({ title: body.title, reporterId: user._id })).toBe(1);
    expect(await WalletTxn.countDocuments({ type: 'REPORT_FEE', issueId: first.body.data.issue._id })).toBe(1);
  });

  it('rejects unauthenticated reports and invalid payloads', async () => {
    expect((await request(app).post('/api/issues').send(issueBody())).status).toBe(401);

    const user = await makeFundedCitizen();
    const bad = await request(app)
      .post('/api/issues')
      .set('Authorization', `Bearer ${tokenFor(user)}`)
      .send(issueBody({ title: 'ab' }));
    expect(bad.status).toBe(400);
    expect(bad.body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('GET /api/issues — feed', () => {
  it('filters by category/status, sorts, paginates and hides REJECTED', async () => {
    const user = await makeFundedCitizen(100000);
    const token = tokenFor(user);
    const created = [];
    for (const category of ['ROAD', 'ROAD', 'GARBAGE']) {
      const res = await request(app).post('/api/issues').set('Authorization', `Bearer ${token}`).send(issueBody({ category }));
      created.push(res.body.data.issue._id);
    }
    await transitionIssue(created[2], 'REJECTED', { userId: (await makeUser({ role: 'ADMIN' }))._id.toString(), role: 'ADMIN' }, 'spam');

    const all = await request(app).get('/api/issues?page=1&limit=10&sort=latest');
    expect(all.status).toBe(200);
    const ids = all.body.data.issues.map((i) => i._id);
    expect(ids).not.toContain(created[2]); // REJECTED hidden
    expect(ids).toContain(created[0]);

    const roads = await request(app).get('/api/issues?category=ROAD');
    expect(roads.body.data.issues.every((i) => i.category === 'ROAD')).toBe(true);
    expect(roads.body.data.pagination.limit).toBe(12);

    const page1 = await request(app).get('/api/issues?page=1&limit=1');
    expect(page1.body.data.issues).toHaveLength(1);
    expect(page1.body.data.pagination.totalPages).toBeGreaterThan(1);

    const badSort = await request(app).get('/api/issues?sort=bogus');
    expect(badSort.status).toBe(400);
  });

  it('serves public metadata for the wizard', async () => {
    const res = await request(app).get('/api/issues/meta');
    expect(res.status).toBe(200);
    expect(res.body.data.reportFeePaise).toBe(500);
    expect(res.body.data.categories).toContain('STREETLIGHT');
  });
});

describe('GET /api/issues/:id — detail', () => {
  it('returns issue + timeline + viewer context', async () => {
    const reporter = await makeFundedCitizen();
    const create = await request(app).post('/api/issues').set('Authorization', `Bearer ${tokenFor(reporter)}`).send(issueBody());
    const issueId = create.body.data.issue._id;

    const anon = await request(app).get(`/api/issues/${issueId}`);
    expect(anon.status).toBe(200);
    expect(anon.body.data.viewer).toMatchObject({ isAuthenticated: false, isReporter: false, hasSupported: false });

    const asReporter = await request(app).get(`/api/issues/${issueId}`).set('Authorization', `Bearer ${tokenFor(reporter)}`);
    expect(asReporter.body.data.viewer).toMatchObject({ isAuthenticated: true, isReporter: true, hasSupported: true });
    expect(asReporter.body.data.updates).toHaveLength(1);

    const missing = await request(app).get(`/api/issues/${new mongoose.Types.ObjectId()}`);
    expect(missing.status).toBe(404);
    expect(missing.body.error.code).toBe('ISSUE_NOT_FOUND');

    const badId = await request(app).get('/api/issues/not-an-id');
    expect(badId.status).toBe(400);
  });
});

describe('transitionIssue — lifecycle state machine', () => {
  const createFreshIssue = async () => {
    const reporter = await makeFundedCitizen();
    const res = await request(app).post('/api/issues').set('Authorization', `Bearer ${tokenFor(reporter)}`).send(issueBody());
    return { reporter, issueId: res.body.data.issue._id };
  };

  it('allows the admin chain ACTIVE → ACKNOWLEDGED → IN_PROGRESS → RESOLVED → CLOSED with timeline rows', async () => {
    const { issueId } = await createFreshIssue();
    const admin = await makeUser({ role: 'ADMIN' });
    const actor = { userId: admin._id.toString(), role: 'ADMIN' };

    for (const status of ['ACKNOWLEDGED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']) {
      const updated = await transitionIssue(issueId, status, actor, `moving to ${status}`);
      expect(updated.status).toBe(status);
    }

    const issue = await Issue.findById(issueId);
    expect(issue.resolvedAt).toBeInstanceOf(Date);
    const updates = await IssueUpdate.find({ issueId }).sort({ createdAt: 1 });
    expect(updates).toHaveLength(5); // creation + 4 transitions
    expect(updates.map((u) => u.toStatus)).toEqual(['ACTIVE', 'ACKNOWLEDGED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']);
  });

  it('rejects invalid transitions and terminal states', async () => {
    const { issueId } = await createFreshIssue();
    const admin = { userId: (await makeUser({ role: 'ADMIN' }))._id.toString(), role: 'ADMIN' };

    await expect(transitionIssue(issueId, 'CLOSED', admin, '')).rejects.toMatchObject({ code: 'INVALID_TRANSITION' });
    await transitionIssue(issueId, 'REJECTED', admin, 'spam');
    await expect(transitionIssue(issueId, 'ACTIVE', admin, '')).rejects.toMatchObject({ code: 'INVALID_TRANSITION' });

    const issue = await Issue.findById(issueId);
    expect(issue.status).toBe('REJECTED');
  });

  it('rejection refunds every contribution and zeroes the fund', async () => {
    const reporter = await makeFundedCitizen();
    const token = tokenFor(reporter);
    const res = await request(app).post('/api/issues').set('Authorization', `Bearer ${token}`).send(issueBody());
    const issueId = res.body.data.issue._id;
    expect(await Wallet.findOne({ userId: reporter._id })).toMatchObject({ balancePaise: 14500 });

    const admin = { userId: (await makeUser({ role: 'ADMIN' }))._id.toString(), role: 'ADMIN' };
    const rejected = await transitionIssue(issueId, 'REJECTED', admin, 'duplicate spam');
    expect(rejected.fundPaise).toBe(0);

    expect(await Wallet.findOne({ userId: reporter._id })).toMatchObject({ balancePaise: 15000 });
    const refund = await WalletTxn.findOne({ issueId, type: 'REFUND' });
    expect(refund.amountPaise).toBe(500);

    // Replaying the rejection path can never double-refund (REJECTED is terminal).
    await expect(transitionIssue(issueId, 'REJECTED', admin, 'again')).rejects.toMatchObject({ code: 'INVALID_TRANSITION' });
    expect(await WalletTxn.countDocuments({ issueId, type: 'REFUND' })).toBe(1);
  });

  it('enforces actor permissions: reporter may resolve but not acknowledge', async () => {
    const { reporter, issueId } = await createFreshIssue();
    const reporterActor = { userId: reporter._id.toString(), role: reporter.role };

    await expect(transitionIssue(issueId, 'ACKNOWLEDGED', reporterActor, '')).rejects.toMatchObject({ code: 'FORBIDDEN' });

    const resolved = await transitionIssue(issueId, 'RESOLVED', reporterActor, 'fixed already');
    expect(resolved.status).toBe('RESOLVED');
  });

  it('allows reporter reopen within 7 days and blocks it afterwards or for others', async () => {
    const { reporter, issueId } = await createFreshIssue();
    const reporterActor = { userId: reporter._id.toString(), role: reporter.role };
    const admin = { userId: (await makeUser({ role: 'ADMIN' }))._id.toString(), role: 'ADMIN' };

    await transitionIssue(issueId, 'RESOLVED', admin, '');
    const reopened = await transitionIssue(issueId, 'ACTIVE', reporterActor, 'not fixed');
    expect(reopened.status).toBe('ACTIVE');

    await transitionIssue(issueId, 'RESOLVED', admin, '');
    await Issue.updateOne({ _id: issueId }, { $set: { resolvedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000) } });
    await expect(transitionIssue(issueId, 'ACTIVE', reporterActor, '')).rejects.toMatchObject({ code: 'REOPEN_WINDOW_EXPIRED' });
    await expect(transitionIssue(issueId, 'ACTIVE', admin, '')).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  it('exposes transitions over HTTP with auth and ownership checks', async () => {
    const { reporter, issueId } = await createFreshIssue();
    const admin = await makeUser({ role: 'ADMIN' });

    const unauth = await request(app).post(`/api/issues/${issueId}/transition`).send({ status: 'ACKNOWLEDGED' });
    expect(unauth.status).toBe(401);

    const asReporter = await request(app)
      .post(`/api/issues/${issueId}/transition`)
      .set('Authorization', `Bearer ${tokenFor(reporter)}`)
      .send({ status: 'ACKNOWLEDGED' });
    expect(asReporter.status).toBe(403);
    expect(asReporter.body.error.code).toBe('FORBIDDEN');

    const asAdmin = await request(app)
      .post(`/api/issues/${issueId}/transition`)
      .set('Authorization', `Bearer ${tokenFor(admin)}`)
      .send({ status: 'ACKNOWLEDGED', note: 'Looking into it' });
    expect(asAdmin.status).toBe(200);
    expect(asAdmin.body.data.issue.status).toBe('ACKNOWLEDGED');
  });
});
