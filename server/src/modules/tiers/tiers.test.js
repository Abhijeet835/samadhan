import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import request from 'supertest';

// Mutable env mock: tests flip SMTP/n8n/override without touching .env.
const { testEnv } = vi.hoisted(() => ({
  testEnv: {
    nodeEnv: 'test',
    port: 5000,
    mongoUri: '',
    clientUrl: 'http://localhost:5173',
    jwtSecret: 'test-secret',
    jwtExpiresIn: '7d',
    adminEmail: 'admin@samadhan.local',
    adminPassword: 'Admin@12345',
    cloudinaryCloudName: '',
    cloudinaryApiKey: '',
    cloudinaryApiSecret: '',
    smtpHost: '',
    smtpPort: 587,
    smtpSecure: false,
    smtpUser: '',
    smtpPass: '',
    smtpFrom: 'Samadhan <test@samadhan.local>',
    dispatchOverrideTo: '',
    n8nWebhookUrl: '',
    n8nWebhookSecret: '',
    enableCron: false,
  },
}));
vi.mock('../../config/env.js', () => ({ env: testEnv, isProduction: false }));

import app from '../../app.js';
import User from '../users/user.model.js';
import Settings from '../wallet/settings.model.js';
import Wallet from '../wallet/wallet.model.js';
import WalletTxn from '../wallet/walletTxn.model.js';
import { chargeWallet, ensureDefaultSettings, ensureWallet } from '../wallet/wallet.service.js';
import Issue from '../issues/issue.model.js';
import IssueUpdate from '../issues/issueUpdate.model.js';
import { transitionIssue } from '../issues/issue.service.js';
import Authority from '../authorities/authority.model.js';
import { matchAuthority, normaliseCity } from '../authorities/authority.service.js';
import DispatchLog from '../dispatch/dispatchLog.model.js';
import {
  ensureDispatchRow,
  retryDispatch,
  runDispatchRow,
  setTransportFactory,
} from '../dispatch/dispatch.service.js';
import { renderEscalationEmail } from '../dispatch/dispatch.templates.js';
import AuditLog from './auditLog.model.js';
import { checkTiers } from './tier.service.js';
import { runAutoCloseOnce } from '../../jobs/autoClose.job.js';
import { runDispatchSweepOnce } from '../../jobs/dispatchSweep.job.js';
import { createTokenPayload, generateAccessToken } from '../../utils/jwt.util.js';

let replSet;

const makeUser = async (overrides = {}) =>
  User.create({
    name: 'Test Citizen',
    email: `u${Date.now()}${Math.random().toString(36).slice(2)}@test.local`,
    password: 'Password@123',
    phone: `9${String(Math.floor(Math.random() * 1e9)).padStart(9, '0')}`,
    ...overrides,
  });

const tokenFor = (user) => generateAccessToken(createTokenPayload(user));

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

const makeFundedCitizen = async (balancePaise = 15000, overrides = {}) => {
  const user = await makeUser(overrides);
  await ensureWallet(user._id);
  const delta = balancePaise - 5000;
  if (delta !== 0) {
    await chargeWallet({
      userId: user._id,
      type: delta > 0 ? 'TOPUP' : 'REPORT_FEE',
      amountPaise: delta,
      idempotencyKey: `seed:${user._id}`,
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

const supportReq = (user, issueId) =>
  request(app)
    .post(`/api/issues/${issueId}/support`)
    .set('Authorization', `Bearer ${tokenFor(user)}`)
    .send({ idempotencyKey: `support:${Math.random().toString(36).slice(2)}` });

const setThresholds = async (tier1Paise, tier2Paise) => {
  await Settings.updateOne({ key: 'tier1Paise' }, { $set: { value: tier1Paise } });
  await Settings.updateOne({ key: 'tier2Paise' }, { $set: { value: tier2Paise } });
};

const fundTo = async (issueId, fundPaise) => {
  await Issue.collection.updateOne(
    { _id: new mongoose.Types.ObjectId(issueId) },
    { $set: { fundPaise } },
  );
};

const makeAuthority = (overrides = {}) =>
  Authority.create({
    nameEn: `Dept ${Math.random().toString(36).slice(2)}`,
    nameHi: 'विभाग',
    department: 'Roads & Infrastructure',
    categories: ['ROAD'],
    cityKeys: ['bengaluru'],
    email: `dept.${Math.random().toString(36).slice(2)}@example.org`,
    ...overrides,
  });

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

beforeEach(async () => {
  testEnv.smtpHost = '';
  testEnv.dispatchOverrideTo = '';
  testEnv.n8nWebhookUrl = '';
  testEnv.n8nWebhookSecret = '';
  setTransportFactory(() => ({ sendMail: vi.fn().mockResolvedValue({ messageId: 'mock-id' }) }));
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200 }));
  await Authority.deleteMany({});
  await Settings.updateOne({ key: 'demoMode' }, { $set: { value: false } });
  await setThresholds(20000, 50000);
});

describe('Tier engine — claims and races', () => {
  it('below threshold → nothing claimed', async () => {
    const user = await makeFundedCitizen();
    const issue = await reportIssue(user, issueBody());
    const { claimedTiers, done } = await checkTiers(issue._id);
    await done;
    expect(claimedTiers).toEqual([]);
    expect(await DispatchLog.countDocuments({ issueId: issue._id })).toBe(0);
  });

  it('at threshold → tier 1 claimed once; second call claims nothing', async () => {
    const user = await makeFundedCitizen();
    const issue = await reportIssue(user, issueBody());
    await fundTo(issue._id, 20000);

    const first = await checkTiers(issue._id);
    await first.done;
    expect(first.claimedTiers).toEqual([1]);

    const updated = await Issue.findById(issue._id);
    expect(updated.tiersReached).toEqual([1]);
    expect(updated.tier).toBe(1);
    expect(updated.tier1ReachedAt).toBeTruthy();

    const second = await checkTiers(issue._id);
    await second.done;
    expect(second.claimedTiers).toEqual([]);
    expect(await AuditLog.countDocuments({ issueId: issue._id, tier: 1 })).toBe(1);
    expect(await DispatchLog.countDocuments({ issueId: issue._id, tier: 1, channel: 'N8N_WEBHOOK' })).toBe(1);
  });

  it('20 concurrent checkTiers → exactly ONE claim and one set of dispatch rows', async () => {
    const user = await makeFundedCitizen();
    const issue = await reportIssue(user, issueBody());
    await fundTo(issue._id, 20000);

    const results = await Promise.all(Array.from({ length: 20 }, () => checkTiers(issue._id)));
    await Promise.all(results.map((r) => r.done));

    const claims = results.flatMap((r) => r.claimedTiers);
    expect(claims).toEqual([1]);
    expect(await AuditLog.countDocuments({ issueId: issue._id, tier: 1 })).toBe(1);
    expect(await DispatchLog.countDocuments({ issueId: issue._id })).toBe(1);
  });

  it('a REJECTED issue never claims', async () => {
    const admin = await makeUser({ role: 'ADMIN' });
    const user = await makeFundedCitizen();
    const issue = await reportIssue(user, issueBody());
    await fundTo(issue._id, 60000);
    await transitionIssue(issue._id, 'REJECTED', { userId: admin._id.toString(), role: 'ADMIN' }, 'spam');

    const { claimedTiers, done } = await checkTiers(issue._id);
    await done;
    expect(claimedTiers).toEqual([]);
    expect((await Issue.findById(issue._id)).tiersReached).toEqual([]);
  });

  it('reads thresholds from settings and from demoMode', async () => {
    const user = await makeFundedCitizen();
    const issue = await reportIssue(user, issueBody());
    await fundTo(issue._id, 2500);

    const normal = await checkTiers(issue._id);
    await normal.done;
    expect(normal.claimedTiers).toEqual([]);

    await Settings.updateOne({ key: 'demoMode' }, { $set: { value: true } });
    const demo = await checkTiers(issue._id);
    await demo.done;
    expect(demo.claimedTiers).toEqual([1]); // demo tier 1 = 2000
  });

  it('one call can claim tier 1 then tier 2 in ascending order', async () => {
    const user = await makeFundedCitizen();
    const issue = await reportIssue(user, issueBody());
    await fundTo(issue._id, 50000);

    const { claimedTiers, done } = await checkTiers(issue._id);
    await done;
    expect(claimedTiers).toEqual([1, 2]);
    const updated = await Issue.findById(issue._id);
    expect(updated.tiersReached).toEqual([1, 2]);
    expect(updated.tier).toBe(2);
    expect(await DispatchLog.countDocuments({ issueId: issue._id, tier: 2, channel: 'EMAIL' })).toBe(1);
  });

  it('end-to-end: low thresholds + 10 concurrent supporters → each tier claimed once, ledger exact', async () => {
    await setThresholds(1000, 1500);
    const reporter = await makeFundedCitizen();
    const issue = await reportIssue(reporter, issueBody());
    await makeAuthority({ categories: ['STREETLIGHT'], cityKeys: ['bengaluru'] });
    const supporters = await Promise.all(Array.from({ length: 10 }, () => makeFundedCitizen()));

    const results = await Promise.all(supporters.map((u) => supportReq(u, issue._id)));
    expect(results.every((r) => r.status === 201)).toBe(true);
    // Let background side effects settle.
    await new Promise((r) => setTimeout(r, 300));

    const unlocked = results.flatMap((r) => r.body.data.tierUnlocked);
    expect(unlocked.filter((t) => t === 1)).toHaveLength(1);
    expect(unlocked.filter((t) => t === 2)).toHaveLength(1);

    const updated = await Issue.findById(issue._id);
    expect(updated.fundPaise).toBe(500 + 10 * 100);
    expect(updated.supporterCount).toBe(11);
    expect(updated.tiersReached.sort()).toEqual([1, 2]);
    expect(await DispatchLog.countDocuments({ issueId: issue._id, tier: 2, channel: 'EMAIL' })).toBe(1);
    expect(await AuditLog.countDocuments({ issueId: issue._id, tier: 1 })).toBe(1);
    expect(await AuditLog.countDocuments({ issueId: issue._id, tier: 2 })).toBe(1);

    for (const u of [reporter, ...supporters]) {
      const sum = await WalletTxn.aggregate([
        { $match: { userId: u._id } },
        { $group: { _id: null, total: { $sum: '$amountPaise' } } },
      ]);
      const wallet = await Wallet.findOne({ userId: u._id });
      expect(wallet.balancePaise).toBe(sum[0]?.total ?? 0);
    }
  });
});

describe('Dispatch isolation and retry', () => {
  it('transport throws → payment untouched, tier claimed, EMAIL FAILED; retry → SENT; retry SENT → 409', async () => {
    testEnv.smtpHost = 'smtp.test.local';
    const sendMail = vi.fn().mockRejectedValue(new Error('SMTP connection refused'));
    setTransportFactory(() => ({ sendMail }));

    const reporter = await makeFundedCitizen();
    const supporter = await makeFundedCitizen();
    const issue = await reportIssue(reporter, issueBody({ category: 'ROAD' }));
    await makeAuthority({ categories: ['ROAD'], cityKeys: ['bengaluru'] });
    await setThresholds(500, 600);

    const res = await supportReq(supporter, issue._id);
    expect(res.status).toBe(201); // payment committed despite SMTP failure
    expect(res.body.data.tierUnlocked).toContain(2);
    await new Promise((r) => setTimeout(r, 200));

    expect((await Wallet.findOne({ userId: supporter._id })).balancePaise).toBe(14900);
    const emailRow = await DispatchLog.findOne({ issueId: issue._id, tier: 2, channel: 'EMAIL' });
    expect(emailRow.status).toBe('FAILED');
    expect(emailRow.lastError).toContain('SMTP connection refused');
    expect((await Issue.findById(issue._id)).tiersReached).toContain(2);

    sendMail.mockResolvedValue({ messageId: 'ok-1' });
    const retried = await retryDispatch(emailRow._id);
    expect(retried.status).toBe('SENT');
    expect(retried.messageId).toBe('ok-1');

    await expect(retryDispatch(emailRow._id)).rejects.toMatchObject({ code: 'DISPATCH_NOT_RETRYABLE' });
  });

  it('two concurrent retries → exactly one send', async () => {
    testEnv.smtpHost = 'smtp.test.local';
    const sendMail = vi.fn().mockResolvedValue({ messageId: 'once' });
    setTransportFactory(() => ({ sendMail }));

    const user = await makeFundedCitizen();
    const issue = await reportIssue(user, issueBody());
    const authority = await makeAuthority();
    const row = await ensureDispatchRow({ issueId: issue._id, tier: 2, channel: 'EMAIL', authorityId: authority._id });
    await DispatchLog.updateOne({ _id: row._id }, { $set: { status: 'FAILED', lastError: 'x' } });

    const results = await Promise.allSettled([retryDispatch(row._id), retryDispatch(row._id)]);
    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    expect(fulfilled).toHaveLength(1);
    expect(sendMail).toHaveBeenCalledTimes(1);
    expect((await DispatchLog.findById(row._id)).status).toBe('SENT');
  });

  it('n8n URL empty → SKIPPED; n8n failure → FAILED but payment untouched', async () => {
    const user = await makeFundedCitizen();
    const issue = await reportIssue(user, issueBody());
    await fundTo(issue._id, 20000);
    const first = await checkTiers(issue._id);
    await first.done;
    const row = await DispatchLog.findOne({ issueId: issue._id, tier: 1, channel: 'N8N_WEBHOOK' });
    expect(row.status).toBe('SKIPPED');

    testEnv.n8nWebhookUrl = 'https://n8n.test/hook';
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500 }));
    const issue2 = await reportIssue(user, issueBody());
    await fundTo(issue2._id, 20000);
    const second = await checkTiers(issue2._id);
    await second.done;
    const row2 = await DispatchLog.findOne({ issueId: issue2._id, tier: 1, channel: 'N8N_WEBHOOK' });
    expect(row2.status).toBe('FAILED');
    expect(row2.lastError).toContain('500');
    expect((await Issue.findById(issue2._id)).tiersReached).toEqual([1]);
  });
});

describe('Runner rules and sweep', () => {
  it('issue resolved before send → row CANCELLED (ISSUE_NOT_OPEN)', async () => {
    const reporter = await makeFundedCitizen();
    const issue = await reportIssue(reporter, issueBody());
    const row = await ensureDispatchRow({ issueId: issue._id, tier: 2, channel: 'EMAIL' });
    await transitionIssue(issue._id, 'RESOLVED', { userId: reporter._id.toString(), role: 'CITIZEN' });

    const ran = await runDispatchRow(row._id);
    expect(ran.status).toBe('CANCELLED');
    expect(ran.reason).toBe('ISSUE_NOT_OPEN');
  });

  it('rejecting an issue cancels its PENDING/FAILED rows (refunds untouched)', async () => {
    const admin = await makeUser({ role: 'ADMIN' });
    const reporter = await makeFundedCitizen();
    const issue = await reportIssue(reporter, issueBody());
    const pending = await ensureDispatchRow({ issueId: issue._id, tier: 1, channel: 'N8N_WEBHOOK' });
    const failed = await ensureDispatchRow({ issueId: issue._id, tier: 2, channel: 'EMAIL' });
    await DispatchLog.updateOne({ _id: failed._id }, { $set: { status: 'FAILED' } });

    await transitionIssue(issue._id, 'REJECTED', { userId: admin._id.toString(), role: 'ADMIN' }, 'spam');

    expect((await DispatchLog.findById(pending._id)).status).toBe('CANCELLED');
    expect((await DispatchLog.findById(failed._id)).status).toBe('CANCELLED');
    expect((await Wallet.findOne({ userId: reporter._id })).balancePaise).toBe(15000); // refunded
  });

  it('sweep re-runs stuck PENDING rows once; FAILED rows are not auto-retried', async () => {
    const user = await makeFundedCitizen();
    const issue = await reportIssue(user, issueBody());
    const stuck = await ensureDispatchRow({ issueId: issue._id, tier: 1, channel: 'N8N_WEBHOOK' });
    const failed = await ensureDispatchRow({ issueId: issue._id, tier: 2, channel: 'EMAIL' });
    await DispatchLog.updateOne({ _id: failed._id }, { $set: { status: 'FAILED' } });
    const old = new Date(Date.now() - 11 * 60 * 1000);
    await DispatchLog.collection.updateMany(
      { _id: { $in: [stuck._id, failed._id] } },
      { $set: { updatedAt: old } },
    );

    const result = await runDispatchSweepOnce();
    expect(result.rerun).toBe(1);
    expect((await DispatchLog.findById(stuck._id)).status).toBe('SKIPPED'); // n8n unconfigured
    expect((await DispatchLog.findById(failed._id)).status).toBe('FAILED');
  });
});

describe('Authority matching', () => {
  it('all 5 priorities in order; inactive ignored; null when nothing matches', async () => {
    const exact = await makeAuthority({ categories: ['ROAD'], cityKeys: ['bengaluru'] });
    const cityWild = await makeAuthority({ categories: ['*'], cityKeys: ['bengaluru'] });
    const fallbackCat = await makeAuthority({ categories: ['ROAD'], cityKeys: ['*'], isFallback: true });
    const fallbackWild = await makeAuthority({ categories: ['*'], cityKeys: ['*'], isFallback: true });
    const issue = { category: 'ROAD', location: { city: 'Bengaluru' } };

    expect(String((await matchAuthority(issue))._id)).toBe(String(exact._id));
    await Authority.updateOne({ _id: exact._id }, { $set: { isActive: false } });
    expect(String((await matchAuthority(issue))._id)).toBe(String(cityWild._id));
    await Authority.updateOne({ _id: cityWild._id }, { $set: { isActive: false } });
    expect(String((await matchAuthority(issue))._id)).toBe(String(fallbackCat._id));
    await Authority.updateOne({ _id: fallbackCat._id }, { $set: { isActive: false } });
    expect(String((await matchAuthority(issue))._id)).toBe(String(fallbackWild._id));
    await Authority.updateOne({ _id: fallbackWild._id }, { $set: { isActive: false } });
    expect(await matchAuthority(issue)).toBeNull();
  });

  it('normalises case, diacritics and spaces', async () => {
    expect(normaliseCity('  New   Delhi ')).toBe('new delhi');
    expect(normaliseCity('Zürich')).toBe('zurich');
    const authority = await makeAuthority({ cityKeys: ['zurich'], categories: ['WATER'] });
    const matched = await matchAuthority({ category: 'WATER', location: { city: ' ZÜRICH ' } });
    expect(String(matched._id)).toBe(String(authority._id));
  });

  it('no authority → EMAIL row SKIPPED with NO_AUTHORITY, engine does not crash', async () => {
    const user = await makeFundedCitizen();
    const issue = await reportIssue(user, issueBody({ location: { ...issueBody().location, city: 'Nowhereville' } }));
    await fundTo(issue._id, 50000);
    const { claimedTiers, done } = await checkTiers(issue._id);
    await done;
    expect(claimedTiers).toEqual([1, 2]);
    const emailRow = await DispatchLog.findOne({ issueId: issue._id, tier: 2, channel: 'EMAIL' });
    expect(emailRow.status).toBe('SKIPPED');
    expect(emailRow.reason).toBe('NO_AUTHORITY');
  });
});

describe('Email content rules', () => {
  const baseIssue = {
    _id: '6b05b761a802b609b3f23cc0',
    title: '<script>alert(1)</script> Broken road',
    category: 'ROAD',
    location: { coordinates: [77.59, 12.97], address: '42 MG Road', city: 'Bengaluru', pincode: '560001' },
    supporterCount: 7,
    fundPaise: 12345,
    photos: ['https://cdn.example.org/p1.jpg'],
    createdAt: new Date('2026-11-01T10:00:00Z'),
  };

  it('template: disclaimer + issue URL + bilingual blocks; no PII, no money; HTML escaped', () => {
    const authority = { department: 'Roads & Infrastructure', email: 'dept@example.org' };
    const { subject, bodyText, bodyHtml } = renderEscalationEmail({
      issue: baseIssue,
      authority,
      clientUrl: 'http://localhost:5173',
    });
    expect(subject).toContain('Broken road');
    expect(bodyText).toContain('NOT an official government portal');
    expect(bodyText).toContain('कोई आधिकारिक सरकारी पोर्टल नहीं');
    expect(bodyText).toContain('http://localhost:5173/issues/6b05b761a802b609b3f23cc0');
    expect(bodyText).toContain('The Officer-in-charge, Roads & Infrastructure');
    expect(bodyText).toContain('openstreetmap.org');
    expect(bodyText).toContain('--- हिंदी ---');
    expect(bodyText).not.toContain('₹');
    expect(bodyText).not.toContain('12345');
    expect(bodyText).not.toContain('reporter');
    expect(bodyHtml).not.toContain('<script>');
    expect(bodyHtml).toContain('&lt;script&gt;');
  });

  it('SIMULATED stores the full rendered preview', async () => {
    const user = await makeFundedCitizen();
    const issue = await reportIssue(user, issueBody({ category: 'ROAD' }));
    await makeAuthority({ categories: ['ROAD'], cityKeys: ['bengaluru'] });
    await fundTo(issue._id, 50000);
    const { done } = await checkTiers(issue._id);
    await done;
    const row = await DispatchLog.findOne({ issueId: issue._id, tier: 2, channel: 'EMAIL' });
    expect(row.status).toBe('SIMULATED');
    expect(row.bodyText).toContain('NOT an official government portal');
    expect(row.bodyHtml).toContain('<table');
    expect(row.to).toBeTruthy();
    expect(row.sentAt).toBeTruthy();
  });

  it('DISPATCH_OVERRIDE_TO redirects the send and records the intended recipient', async () => {
    testEnv.smtpHost = 'smtp.test.local';
    testEnv.dispatchOverrideTo = 'safe@test.local';
    const sendMail = vi.fn().mockResolvedValue({ messageId: 'override-1' });
    setTransportFactory(() => ({ sendMail }));

    const user = await makeFundedCitizen();
    const issue = await reportIssue(user, issueBody({ category: 'ROAD' }));
    const authority = await makeAuthority({ categories: ['ROAD'], cityKeys: ['bengaluru'] });
    await fundTo(issue._id, 50000);
    const { done } = await checkTiers(issue._id);
    await done;

    expect(sendMail).toHaveBeenCalledTimes(1);
    const args = sendMail.mock.calls[0][0];
    expect(args.to).toBe('safe@test.local');
    expect(args.subject).toContain(`[TEST → ${authority.email}]`);
    const row = await DispatchLog.findOne({ issueId: issue._id, tier: 2, channel: 'EMAIL' });
    expect(row.status).toBe('SENT');
    expect(row.to).toBe(authority.email);
  });
});

describe('Lifecycle cron and SYSTEM actor', () => {
  const backdateResolved = async (issueId, days) => {
    await Issue.collection.updateOne(
      { _id: new mongoose.Types.ObjectId(issueId) },
      { $set: { resolvedAt: new Date(Date.now() - days * 24 * 60 * 60 * 1000) } },
    );
  };

  it('auto-close closes only RESOLVED older than the window; SYSTEM timeline row', async () => {
    const reporter = await makeFundedCitizen();
    const actor = { userId: reporter._id.toString(), role: 'CITIZEN' };
    const old = await reportIssue(reporter, issueBody());
    const recent = await reportIssue(reporter, issueBody());
    const active = await reportIssue(reporter, issueBody());
    await transitionIssue(old._id, 'RESOLVED', actor);
    await transitionIssue(recent._id, 'RESOLVED', actor);
    await backdateResolved(old._id, 8);
    await backdateResolved(recent._id, 6);

    const result = await runAutoCloseOnce();
    expect(result.closed).toBeGreaterThanOrEqual(1);
    expect((await Issue.findById(old._id)).status).toBe('CLOSED');
    expect((await Issue.findById(recent._id)).status).toBe('RESOLVED');
    expect((await Issue.findById(active._id)).status).toBe('ACTIVE');

    const systemRow = await IssueUpdate.findOne({ issueId: old._id, toStatus: 'CLOSED' });
    expect(systemRow.actorRole).toBe('SYSTEM');
    expect(systemRow.actorId).toBeNull();
  });

  it('two concurrent auto-close runs → one CLOSED timeline row', async () => {
    const reporter = await makeFundedCitizen();
    const issue = await reportIssue(reporter, issueBody());
    await transitionIssue(issue._id, 'RESOLVED', { userId: reporter._id.toString(), role: 'CITIZEN' });
    await backdateResolved(issue._id, 9);

    await Promise.all([runAutoCloseOnce(), runAutoCloseOnce()]);
    expect(await IssueUpdate.countDocuments({ issueId: issue._id, toStatus: 'CLOSED' })).toBe(1);
  });

  it('SYSTEM cannot do any other transition; window must have elapsed', async () => {
    const reporter = await makeFundedCitizen();
    const issue = await reportIssue(reporter, issueBody());
    await expect(transitionIssue(issue._id, 'RESOLVED', { role: 'SYSTEM' })).rejects.toMatchObject({ code: 'FORBIDDEN' });
    await transitionIssue(issue._id, 'RESOLVED', { userId: reporter._id.toString(), role: 'CITIZEN' });
    await expect(transitionIssue(issue._id, 'CLOSED', { role: 'SYSTEM' })).rejects.toMatchObject({ code: 'INVALID_TRANSITION' });
  });

  it('REJECTED allowed from ACTIVE/ACKNOWLEDGED/IN_PROGRESS only — not RESOLVED', async () => {
    const admin = await makeUser({ role: 'ADMIN' });
    const actor = { userId: admin._id.toString(), role: 'ADMIN' };
    const reporter = await makeFundedCitizen(60000);

    const fromAck = await reportIssue(reporter, issueBody());
    await transitionIssue(fromAck._id, 'ACKNOWLEDGED', actor);
    await transitionIssue(fromAck._id, 'REJECTED', actor, 'spam');
    expect((await Issue.findById(fromAck._id)).status).toBe('REJECTED');

    const fromInProgress = await reportIssue(reporter, issueBody());
    await transitionIssue(fromInProgress._id, 'IN_PROGRESS', actor);
    await transitionIssue(fromInProgress._id, 'REJECTED', actor, 'spam');
    expect((await Issue.findById(fromInProgress._id)).status).toBe('REJECTED');

    const resolved = await reportIssue(reporter, issueBody());
    await transitionIssue(resolved._id, 'RESOLVED', actor);
    await expect(transitionIssue(resolved._id, 'REJECTED', actor)).rejects.toMatchObject({ code: 'INVALID_TRANSITION' });
  });
});

describe('Admin HTTP security and public privacy', () => {
  it('every /api/admin/* route: 401 without token, 403 for citizen, OK for admin', async () => {
    const citizen = await makeFundedCitizen();
    const admin = await makeUser({ role: 'ADMIN' });
    const issue = await reportIssue(citizen, issueBody());
    const row = await ensureDispatchRow({ issueId: issue._id, tier: 1, channel: 'N8N_WEBHOOK' });

    const routes = [
      ['get', '/api/admin/authorities'],
      ['post', '/api/admin/authorities'],
      ['get', '/api/admin/dispatch'],
      ['post', `/api/admin/dispatch/${row._id}/retry`],
      ['post', `/api/admin/issues/${issue._id}/recheck-tiers`],
    ];

    for (const [method, url] of routes) {
      const anon = await request(app)[method](url).send({});
      expect(anon.status, `${method} ${url} anon`).toBe(401);
      const asCitizen = await request(app)[method](url).set('Authorization', `Bearer ${tokenFor(citizen)}`).send({});
      expect(asCitizen.status, `${method} ${url} citizen`).toBe(403);
    }

    const list = await request(app).get('/api/admin/dispatch').set('Authorization', `Bearer ${tokenFor(admin)}`);
    expect(list.status).toBe(200);
    const authorities = await request(app).get('/api/admin/authorities').set('Authorization', `Bearer ${tokenFor(admin)}`);
    expect(authorities.status).toBe(200);
    const recheck = await request(app)
      .post(`/api/admin/issues/${issue._id}/recheck-tiers`)
      .set('Authorization', `Bearer ${tokenFor(admin)}`);
    expect(recheck.status).toBe(200);
  });

  it('public issue detail exposes escalation summary but NEVER the authority email', async () => {
    const user = await makeFundedCitizen();
    const issue = await reportIssue(user, issueBody({ category: 'ROAD' }));
    const authority = await makeAuthority({ categories: ['ROAD'], cityKeys: ['bengaluru'] });
    await fundTo(issue._id, 50000);
    const { done } = await checkTiers(issue._id);
    await done;

    const res = await request(app).get(`/api/issues/${issue._id}`);
    expect(res.status).toBe(200);
    expect(res.body.data.escalation).toMatchObject({ status: 'SIMULATED' });
    expect(res.body.data.escalation.authorityName).toBeTruthy();
    expect(res.body.data.issue.tiersReached.sort()).toEqual([1, 2]);
    const raw = JSON.stringify(res.body);
    const allAuthorities = await Authority.find().lean();
    for (const a of allAuthorities) {
      expect(raw).not.toContain(a.email);
    }
    expect(raw).not.toContain('bodyText');
    expect(res.body.data.escalation.subject).toBeUndefined();
  });
});
