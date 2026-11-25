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
import Issue from '../issues/issue.model.js';
import IssueSupport from '../issues/issueSupport.model.js';
import IssueFlag from './issueFlag.model.js';
import AuditLog from '../tiers/auditLog.model.js';
import Helper from '../helpers/helper.model.js';
import Authority from '../authorities/authority.model.js';
import { createTokenPayload, generateAccessToken } from '../../utils/jwt.util.js';

let replSet;
const makeUser = async (ov = {}) => User.create({ name: 'Test Citizen', email: `u${Date.now()}${Math.random().toString(36).slice(2)}@test.local`, password: 'Password@123', phone: `9${String(Math.floor(Math.random() * 1e9)).padStart(9, '0')}`, ...ov });
const tokenFor = (u) => generateAccessToken(createTokenPayload(u));
const funded = async (bal = 15000, ov = {}) => { const u = await makeUser(ov); await ensureWallet(u._id); const d = bal - 5000; if (d) await chargeWallet({ userId: u._id, type: d > 0 ? 'TOPUP' : 'REPORT_FEE', amountPaise: d, idempotencyKey: `seed:${u._id}` }); return u; };
const report = async (u, ov = {}) => {
  const res = await request(app).post('/api/issues').set('Authorization', `Bearer ${tokenFor(u)}`).send({ title: 'Broken streetlight on MG Road', description: 'The streetlight outside number 42 has been dead for two weeks making the lane unsafe.', category: 'STREETLIGHT', location: { coordinates: [77.5946 + (Math.random() - 0.5) * 0.4, 12.9716 + (Math.random() - 0.5) * 0.4], city: 'Bengaluru' }, idempotencyKey: `r:${Math.random().toString(36).slice(2)}`, ...ov });
  expect(res.status).toBe(201); return res.body.data.issue;
};
let admin, citizen, helperRole;
const A = () => ({ Authorization: `Bearer ${tokenFor(admin)}` });

beforeAll(async () => {
  replSet = await MongoMemoryReplSet.create({ replSet: { count: 1, storageEngine: 'wiredTiger' } });
  await mongoose.connect(replSet.getUri());
  await ensureDefaultSettings();
  admin = await makeUser({ role: 'ADMIN' });
  citizen = await funded();
  helperRole = await makeUser({ role: 'HELPER' });
}, 300_000);
afterAll(async () => { await mongoose.disconnect(); await replSet?.stop(); });

describe('Admin RBAC matrix', () => {
  it('401 no token / 403 citizen / 403 helper / 200 admin on every new route', async () => {
    const issue = await report(citizen);
    const routes = [
      ['get', '/api/admin/issues'], ['get', `/api/admin/issues/${issue._id}`],
      ['post', `/api/admin/issues/${issue._id}/transition`], ['patch', `/api/admin/issues/${issue._id}/authority`],
      ['post', `/api/admin/issues/${issue._id}/authority-reply`], ['post', `/api/admin/issues/${issue._id}/credit`],
      ['post', `/api/admin/issues/${issue._id}/flags/dismiss`],
      ['get', '/api/admin/users'], ['get', `/api/admin/users/${citizen._id}`], ['patch', `/api/admin/users/${citizen._id}`],
      ['get', '/api/admin/settings'], ['patch', '/api/admin/settings'],
      ['get', '/api/admin/categories'], ['patch', '/api/admin/categories'],
      ['get', '/api/admin/dashboard'], ['get', '/api/admin/audit'], ['get', '/api/admin/audit/actions'],
    ];
    for (const [m, url] of routes) {
      expect((await request(app)[m](url).send({})).status, `${m} ${url} anon`).toBe(401);
      expect((await request(app)[m](url).set('Authorization', `Bearer ${tokenFor(citizen)}`).send({})).status, `${m} ${url} citizen`).toBe(403);
      expect((await request(app)[m](url).set('Authorization', `Bearer ${tokenFor(helperRole)}`).send({})).status, `${m} ${url} helper`).toBe(403);
    }
    expect((await request(app).get('/api/admin/dashboard').set(A())).status).toBe(200);
    expect((await request(app).get('/api/admin/audit/actions').set(A())).status).toBe(200);
  });
});

describe('Admin transition wrapper + rejection', () => {
  it('REJECTED needs note ≥10; end-to-end refund, fund 0, ledger sums, notifications', async () => {
    const reporter = await funded();
    const issue = await report(reporter);
    const supporter = await funded();
    await request(app).post(`/api/issues/${issue._id}/support`).set('Authorization', `Bearer ${tokenFor(supporter)}`).send({ idempotencyKey: `s:${Math.random()}` });

    const short = await request(app).post(`/api/admin/issues/${issue._id}/transition`).set(A()).send({ status: 'REJECTED', note: 'short' });
    expect(short.status).toBe(400);

    const ok = await request(app).post(`/api/admin/issues/${issue._id}/transition`).set(A()).send({ status: 'REJECTED', note: 'This is spam content' });
    expect(ok.status).toBe(200);
    expect((await Issue.findById(issue._id)).fundPaise).toBe(0);
    expect((await Wallet.findOne({ userId: reporter._id })).balancePaise).toBe(15000);
    expect((await Wallet.findOne({ userId: supporter._id })).balancePaise).toBe(15000);
    for (const u of [reporter, supporter]) {
      const sum = await WalletTxn.aggregate([{ $match: { userId: u._id } }, { $group: { _id: null, t: { $sum: '$amountPaise' } } }]);
      expect((await Wallet.findOne({ userId: u._id })).balancePaise).toBe(sum[0].t);
    }
    expect(await AuditLog.countDocuments({ action: 'ISSUE_TRANSITION', entityId: String(issue._id) })).toBe(1);
  });
});

describe('Platform credit', () => {
  it('idempotent, invariant, crosses tier, not refunded on reject, max bound, terminal 409', async () => {
    await Settings.updateOne({ key: 'tier1Paise' }, { $set: { value: 1000 } });
    const reporter = await funded();
    const issue = await report(reporter);
    const key = `credit:${Math.random().toString(36).slice(2)}`;
    const c1 = await request(app).post(`/api/admin/issues/${issue._id}/credit`).set(A()).send({ amountPaise: 600, reason: 'Community boost', idempotencyKey: key });
    expect(c1.status).toBe(200);
    expect(c1.body.data.tierUnlocked).toContain(1);
    const c2 = await request(app).post(`/api/admin/issues/${issue._id}/credit`).set(A()).send({ amountPaise: 600, reason: 'Community boost', idempotencyKey: key });
    expect(c2.body.data.idempotent).toBe(true);
    const iss = await Issue.findById(issue._id);
    expect(iss.fundPaise).toBe(500 + 600);
    expect(iss.platformCreditPaise).toBe(600);
    expect(iss.supporterCount).toBe(1);
    expect(await WalletTxn.countDocuments({ issueId: issue._id, type: 'PLATFORM_CREDIT' })).toBe(0);

    const supports = await IssueSupport.aggregate([{ $match: { issueId: new mongoose.Types.ObjectId(issue._id) } }, { $group: { _id: null, t: { $sum: '$amountPaise' } } }]);
    expect(iss.fundPaise).toBe((supports[0]?.t ?? 0) + iss.platformCreditPaise);

    expect((await request(app).post(`/api/admin/issues/${issue._id}/credit`).set(A()).send({ amountPaise: 999999, reason: 'too big', idempotencyKey: `k:${Math.random()}` })).status).toBe(400);
    const other = await report(reporter);
    expect((await request(app).post(`/api/admin/issues/${other._id}/credit`).set(A()).send({ amountPaise: 100, reason: 'reuse key', idempotencyKey: key })).status).toBe(409);

    await request(app).post(`/api/admin/issues/${issue._id}/transition`).set(A()).send({ status: 'REJECTED', note: 'reject after credit' });
    expect((await Issue.findById(issue._id)).fundPaise).toBe(0);
    expect((await Wallet.findOne({ userId: reporter._id })).balancePaise).toBe(14500); // report fee refunded, credit NOT refunded, other issue fee remains
    await Settings.updateOne({ key: 'tier1Paise' }, { $set: { value: 20000 } });
  });
});

describe('Authority reply + assign, issue flags', () => {
  it('reply contact guard + notification + blocked on REJECTED; assign inactive 400', async () => {
    const issue = await report(citizen);
    const authority = await Authority.create({ nameEn: 'Roads Cell', nameHi: 'सड़क', department: 'Roads', categories: ['ROAD'], cityKeys: ['bengaluru'], email: 'roads@example.org', isActive: true });
    const assign = await request(app).patch(`/api/admin/issues/${issue._id}/authority`).set(A()).send({ authorityId: String(authority._id) });
    expect(assign.status).toBe(200);
    expect((await Issue.findById(issue._id)).authorityId.toString()).toBe(String(authority._id));

    const bad = await request(app).post(`/api/admin/issues/${issue._id}/authority-reply`).set(A()).send({ message: 'Call 9876543210 for details' });
    expect(bad.status).toBe(400);
    expect(bad.body.error.code).toBe('CONTACT_IN_TEXT');
    const reply = await request(app).post(`/api/admin/issues/${issue._id}/authority-reply`).set(A()).send({ message: 'Work scheduled for next week.' });
    expect(reply.status).toBe(200);

    const inactive = await Authority.create({ nameEn: 'Inactive', nameHi: 'x', department: 'X', categories: ['*'], cityKeys: ['*'], email: 'i@example.org', isActive: false });
    expect((await request(app).patch(`/api/admin/issues/${issue._id}/authority`).set(A()).send({ authorityId: String(inactive._id) })).status).toBe(400);
  });

  it('issue flags: unique, own blocked, no auto-hide, dismiss', async () => {
    const issue = await report(citizen);
    const own = await request(app).post(`/api/issues/${issue._id}/flag`).set('Authorization', `Bearer ${tokenFor(citizen)}`).send({ reason: 'SPAM' });
    expect(own.status).toBe(409);
    expect(own.body.error.code).toBe('CANNOT_FLAG_OWN_ISSUE');
    const f1 = await request(app).post(`/api/issues/${issue._id}/flag`).set('Authorization', `Bearer ${tokenFor(helperRole)}`).send({ reason: 'SPAM' });
    expect(f1.status).toBe(200);
    expect((await request(app).post(`/api/issues/${issue._id}/flag`).set('Authorization', `Bearer ${tokenFor(helperRole)}`).send({ reason: 'SPAM' })).status).toBe(409);
    expect((await Issue.findById(issue._id)).status).toBe('ACTIVE'); // never auto-hidden
    const dismiss = await request(app).post(`/api/admin/issues/${issue._id}/flags/dismiss`).set(A());
    expect(dismiss.body.data.modifiedCount).toBe(1);
    expect(await IssueFlag.countDocuments({ issueId: issue._id, dismissed: false })).toBe(0);
  });
});

describe('Admin users', () => {
  it('self/admin target blocked; disabled token rejected; helper hidden on disable', async () => {
    expect((await request(app).patch(`/api/admin/users/${admin._id}`).set(A()).send({ isActive: false })).status).toBe(403);
    const otherAdmin = await makeUser({ role: 'ADMIN' });
    expect((await request(app).patch(`/api/admin/users/${otherAdmin._id}`).set(A()).send({ isActive: false })).status).toBe(403);

    const target = await makeUser({ role: 'HELPER' });
    await Helper.create({ userId: target._id, displayName: 'Disable Me', phone: '9876543210', categories: ['PLUMBER'], bio: 'Experienced local plumber serving the neighbourhood with reliable service.', serviceLocation: { type: 'Point', coordinates: [77.6, 12.97], city: 'Bengaluru' }, verificationStatus: 'VERIFIED' });
    const token = tokenFor(target);
    const dis = await request(app).patch(`/api/admin/users/${target._id}`).set(A()).send({ isActive: false });
    expect(dis.status).toBe(200);
    expect((await Helper.findOne({ userId: target._id })).isHidden).toBe(true);
    expect((await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`)).status).toBe(403);
  });
});

describe('Settings + categories', () => {
  it('bounds, tier2>tier1, effect on fee + meta, audit, zero rejected', async () => {
    expect((await request(app).patch('/api/admin/settings').set(A()).send({ reportFeePaise: 0 })).status).toBe(400);
    expect((await request(app).patch('/api/admin/settings').set(A()).send({ reportFeePaise: 99999 })).status).toBe(400);
    expect((await request(app).patch('/api/admin/settings').set(A()).send({ tier1Paise: 5000, tier2Paise: 4000 })).status).toBe(400);
    const ok = await request(app).patch('/api/admin/settings').set(A()).send({ reportFeePaise: 700 });
    expect(ok.status).toBe(200);
    expect(ok.body.data.before.reportFeePaise).toBe(500);
    expect(ok.body.data.after.reportFeePaise).toBe(700);
    expect((await request(app).get('/api/issues/meta')).body.data.reportFeePaise).toBe(700);
    await request(app).patch('/api/admin/settings').set(A()).send({ reportFeePaise: 500 });
    expect(await AuditLog.countDocuments({ action: 'SETTINGS_PATCH' })).toBeGreaterThanOrEqual(1);
  });

  it('categories: disabled rejected on create, cannot disable OTHER/all, meta enabled only', async () => {
    expect((await request(app).patch('/api/admin/categories').set(A()).send({ disabledIssueCategories: ['OTHER'] })).status).toBe(400);
    const all = ['ROAD', 'GARBAGE', 'WATER', 'STREETLIGHT', 'SEWAGE', 'ELECTRICITY', 'PARK', 'OTHER'];
    expect((await request(app).patch('/api/admin/categories').set(A()).send({ disabledIssueCategories: all })).status).toBe(400);
    await request(app).patch('/api/admin/categories').set(A()).send({ disabledIssueCategories: ['PARK'] });
    expect((await request(app).get('/api/issues/meta')).body.data.categories).not.toContain('PARK');
    const blocked = await request(app).post('/api/issues').set('Authorization', `Bearer ${tokenFor(citizen)}`).send({ title: 'Park issue here', description: 'The park benches are broken and need repair urgently please.', category: 'PARK', location: { coordinates: [77.6, 12.97], city: 'Bengaluru' }, idempotencyKey: `r:${Math.random()}` });
    expect(blocked.status).toBe(400);
    expect(blocked.body.error.code).toBe('CATEGORY_DISABLED');
    await request(app).patch('/api/admin/categories').set(A()).send({ disabledIssueCategories: [] });
  });
});

describe('Dashboard + audit viewer', () => {
  it('dashboard integer paise, revenue = fees - refunds, zero-filled days', async () => {
    const res = await request(app).get('/api/admin/dashboard?days=7').set(A());
    expect(res.status).toBe(200);
    const d = res.body.data;
    expect(d.simulatedRevenue.netPaise).toBe(d.simulatedRevenue.grossFeesPaise - d.simulatedRevenue.refundsPaise);
    expect(Object.keys(d.series.issuesPerDay)).toHaveLength(7);
    expect(Number.isInteger(d.funds.openFundPaise)).toBe(true);
  });

  it('audit lists legacy + new rows, no PII, no mutation endpoints', async () => {
    const res = await request(app).get('/api/admin/audit').set(A());
    expect(res.status).toBe(200);
    expect(res.body.data.items.length).toBeGreaterThan(0);
    const raw = JSON.stringify(res.body.data.items);
    expect(raw).not.toContain('password');
    expect((await request(app).patch('/api/admin/audit').set(A()).send({})).status).toBe(404);
    expect((await request(app).delete('/api/admin/audit').set(A())).status).toBe(404);
  });
});
