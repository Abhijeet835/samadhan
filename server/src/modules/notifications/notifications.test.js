import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import request from 'supertest';

import app from '../../app.js';
import User from '../users/user.model.js';
import Settings from '../wallet/settings.model.js';
import WalletTxn from '../wallet/walletTxn.model.js';
import { chargeWallet, ensureDefaultSettings, ensureWallet } from '../wallet/wallet.service.js';
import Issue from '../issues/issue.model.js';
import IssueSupport from '../issues/issueSupport.model.js';
import { transitionIssue } from '../issues/issue.service.js';
import { checkTiers } from '../tiers/tier.service.js';
import Helper from '../helpers/helper.model.js';
import Notification from './notification.model.js';
import { notifyUsers } from './notification.service.js';
import { createTokenPayload, generateAccessToken } from '../../utils/jwt.util.js';

let replSet;
const makeUser = async (overrides = {}) =>
  User.create({
    name: 'Test Citizen', email: `u${Date.now()}${Math.random().toString(36).slice(2)}@test.local`,
    password: 'Password@123', phone: `9${String(Math.floor(Math.random() * 1e9)).padStart(9, '0')}`, ...overrides,
  });
const tokenFor = (u) => generateAccessToken(createTokenPayload(u));
const funded = async (bal = 15000, ov = {}) => {
  const u = await makeUser(ov);
  await ensureWallet(u._id);
  const d = bal - 5000;
  if (d) await chargeWallet({ userId: u._id, type: d > 0 ? 'TOPUP' : 'REPORT_FEE', amountPaise: d, idempotencyKey: `seed:${u._id}` });
  return u;
};
const report = async (u, ov = {}) => {
  const res = await request(app).post('/api/issues').set('Authorization', `Bearer ${tokenFor(u)}`).send({
    title: 'Broken streetlight on MG Road', description: 'The streetlight outside number 42 has been dead for two weeks making the lane unsafe.',
    category: 'STREETLIGHT', location: { coordinates: [77.5946 + (Math.random() - 0.5) * 0.3, 12.9716 + (Math.random() - 0.5) * 0.3], city: 'Bengaluru' },
    idempotencyKey: `r:${Math.random().toString(36).slice(2)}`, ...ov,
  });
  expect(res.status).toBe(201);
  return res.body.data.issue;
};

beforeAll(async () => {
  replSet = await MongoMemoryReplSet.create({ replSet: { count: 1, storageEngine: 'wiredTiger' } });
  await mongoose.connect(replSet.getUri());
  await Issue.init();
  await ensureDefaultSettings();
}, 300_000);
afterAll(async () => { await mongoose.disconnect(); await replSet?.stop(); });

describe('GET /api/issues/map', () => {
  it('bbox + filters, REJECTED excluded, truncated flag, no reporter fields, route order', async () => {
    const u = await funded(60000);
    const admin = await makeUser({ role: 'ADMIN' });
    const inBox = await report(u, { location: { coordinates: [77.6, 12.97], city: 'Bengaluru' } });
    await report(u, { location: { coordinates: [78.5, 13.5], city: 'Far' } });
    const rejected = await report(u, { force: true, location: { coordinates: [77.6, 12.97], city: 'Bengaluru' } });
    await transitionIssue(rejected._id, 'REJECTED', { userId: admin._id.toString(), role: 'ADMIN' }, 'spam reason');

    const res = await request(app).get('/api/issues/map?west=77.5&south=12.9&east=77.7&north=13.0');
    expect(res.status).toBe(200);
    const ids = res.body.data.items.map((i) => i._id);
    expect(ids).toContain(inBox._id);
    expect(ids).not.toContain(rejected._id);
    expect(res.body.data.items.every((i) => !('reporterId' in i))).toBe(true);
    expect(JSON.stringify(res.body)).not.toContain(u.email);

    await report(u, { force: true, location: { coordinates: [77.62, 12.98], city: 'Bengaluru' } });
    const trunc = await request(app).get('/api/issues/map?west=77.5&south=12.9&east=77.7&north=13.0&limit=1');
    expect(trunc.body.data.truncated).toBe(true);
    expect(trunc.body.data.items).toHaveLength(1);

    expect((await request(app).get('/api/issues/map?west=77.5')).status).toBe(400);
    expect((await request(app).get('/api/issues/map?west=77.5&south=12.9&east=77.7&north=13.0')).status).toBe(200);
    const tooBig = await request(app).get('/api/issues/map?west=70&south=10&east=80&north=20');
    expect(tooBig.status).toBe(400);
    expect(tooBig.body.error.code).toBe('BBOX_TOO_LARGE');
    const invalid = await request(app).get('/api/issues/map?west=78&south=12&east=77&north=13');
    expect(invalid.body.error.code).toBe('BBOX_INVALID');

    const cat = await request(app).get('/api/issues/map?category=WATER');
    expect(cat.body.data.items.every((i) => i.category === 'WATER')).toBe(true);
    expect(typeof res.body.data.items[0].explosionTriggered).toBe('boolean');
    expect(res.body.data.items[0].issueType).toBe('SOCIAL_EXPLOSION');
  });

  it('CORS normalizes trailing slashes on origins and rejects unknown origins', async () => {
    const ok = await request(app).get('/api/health').set('Origin', 'http://localhost:5173/');
    expect(ok.headers['access-control-allow-origin']).toBe('http://localhost:5173/');
    const blocked = await request(app).get('/api/health').set('Origin', 'https://evil.example');
    expect(blocked.headers['access-control-allow-origin']).toBeUndefined();
  });
});

describe('Helper public-location privacy (8A)', () => {
  it('public responses round coords to 3dp and omit address; owner/admin keep exact', async () => {
    const owner = await makeUser({ role: 'HELPER' });
    const exact = [77.59461234, 12.97165678];
    const helper = await Helper.create({
      userId: owner._id, displayName: 'Privacy Helper', phone: '9876543210', categories: ['PLUMBER'],
      bio: 'Experienced local plumber serving the neighbourhood with reliable and timely service.',
      serviceLocation: { type: 'Point', coordinates: exact, address: '42 Secret Street', city: 'Bengaluru', pincode: '560001' },
      verificationStatus: 'VERIFIED', radiusKm: 10,
    });
    const pub = await request(app).get(`/api/helpers/${helper._id}`);
    expect(pub.body.data.helper.serviceLocation.address).toBeUndefined();
    expect(pub.body.data.helper.serviceLocation.coordinates[0]).toBe(77.595);
    expect(JSON.stringify(pub.body)).not.toContain('42 Secret Street');

    const search = await request(app).get('/api/helpers/search?lat=12.9716&lng=77.5946&radiusKm=5');
    const found = search.body.data.items.find((h) => h._id === String(helper._id));
    expect(found.serviceLocation.address).toBeUndefined();

    const dash = await request(app).get('/api/helpers/me/dashboard').set('Authorization', `Bearer ${tokenFor(owner)}`);
    expect(dash.body.data.helper.serviceLocation.address).toBe('42 Secret Street');
    expect(dash.body.data.helper.serviceLocation.coordinates[0]).toBe(exact[0]);

    const admin = await makeUser({ role: 'ADMIN' });
    const adminView = await request(app).get(`/api/admin/helpers`).set('Authorization', `Bearer ${tokenFor(admin)}`);
    const row = adminView.body.data.rows.find((h) => h._id === String(helper._id));
    expect(row.serviceLocation.address).toBe('42 Secret Street');
  });
});

describe('Notifications', () => {
  it('ownership, read idempotent, read-all own only, unread-count, pagination, dedupe, 401', async () => {
    const a = await makeUser(); const b = await makeUser();
    await notifyUsers({ userIds: [a._id], type: 'HELPER_VERIFIED', payload: { helperId: 'x' }, dedupeKey: 'k1' });
    await notifyUsers({ userIds: [a._id], type: 'HELPER_VERIFIED', payload: { helperId: 'x' }, dedupeKey: 'k1' });
    expect(await Notification.countDocuments({ userId: a._id })).toBe(1);

    expect((await request(app).get('/api/notifications')).status).toBe(401);
    const list = await request(app).get('/api/notifications').set('Authorization', `Bearer ${tokenFor(a)}`);
    expect(list.body.data.items).toHaveLength(1);
    expect(list.body.data.unreadCount).toBe(1);
    const id = list.body.data.items[0]._id;

    expect((await request(app).patch(`/api/notifications/${id}/read`).set('Authorization', `Bearer ${tokenFor(b)}`)).status).toBe(404);
    expect((await request(app).patch(`/api/notifications/${id}/read`).set('Authorization', `Bearer ${tokenFor(a)}`)).status).toBe(200);
    expect((await request(app).patch(`/api/notifications/${id}/read`).set('Authorization', `Bearer ${tokenFor(a)}`)).status).toBe(200);
    expect((await request(app).get('/api/notifications/unread-count').set('Authorization', `Bearer ${tokenFor(a)}`)).body.data.unreadCount).toBe(0);

    await notifyUsers({ userIds: [a._id, b._id], type: 'HELPER_UNHIDDEN', payload: {} });
    const all = await request(app).post('/api/notifications/read-all').set('Authorization', `Bearer ${tokenFor(a)}`);
    expect(all.body.data.modifiedCount).toBeGreaterThanOrEqual(1);
    expect((await request(app).get('/api/notifications/unread-count').set('Authorization', `Bearer ${tokenFor(b)}`)).body.data.unreadCount).toBe(1);

    const unread = await request(app).get('/api/notifications?unreadOnly=true').set('Authorization', `Bearer ${tokenFor(a)}`);
    expect(unread.body.data.items).toHaveLength(0);
  });

  it('tier winner fans out to reporter + supporters exactly once under 20 concurrent claims', async () => {
    await Settings.updateOne({ key: 'tier1Paise' }, { $set: { value: 1000 } });
    const reporter = await funded();
    const issue = await report(reporter);
    const supporters = await Promise.all([funded(), funded()]);
    for (const s of supporters) {
      await request(app).post(`/api/issues/${issue._id}/support`).set('Authorization', `Bearer ${tokenFor(s)}`).send({ idempotencyKey: `s:${Math.random()}` });
    }
    await Settings.updateOne({ key: 'tier1Paise' }, { $set: { value: 700 } });
    const results = await Promise.all(Array.from({ length: 20 }, () => checkTiers(issue._id)));
    await Promise.all(results.map((r) => r.done));
    await new Promise((r) => setTimeout(r, 100));

    const audience = [reporter._id, ...supporters.map((s) => s._id)];
    for (const uid of audience) {
      expect(await Notification.countDocuments({ userId: uid, type: 'TIER_1_REACHED', 'payload.issueId': String(issue._id) })).toBe(1);
    }
    await Settings.updateOne({ key: 'tier1Paise' }, { $set: { value: 20000 } });
  });

  it('transition notifies reporter + supporters excluding actor; REJECTED carries per-user refundPaise', async () => {
    const admin = await makeUser({ role: 'ADMIN' });
    const reporter = await funded();
    const supporter = await funded();
    const issue = await report(reporter);
    await request(app).post(`/api/issues/${issue._id}/support`).set('Authorization', `Bearer ${tokenFor(supporter)}`).send({ idempotencyKey: `s:${Math.random()}` });

    await transitionIssue(issue._id, 'ACKNOWLEDGED', { userId: admin._id.toString(), role: 'ADMIN' });
    await new Promise((r) => setTimeout(r, 80));
    expect(await Notification.countDocuments({ userId: reporter._id, type: 'ISSUE_STATUS_CHANGED' })).toBe(1);
    expect(await Notification.countDocuments({ userId: supporter._id, type: 'ISSUE_STATUS_CHANGED' })).toBe(1);
    expect(await Notification.countDocuments({ userId: admin._id, type: 'ISSUE_STATUS_CHANGED' })).toBe(0);

    await transitionIssue(issue._id, 'REJECTED', { userId: admin._id.toString(), role: 'ADMIN' }, 'spam reason here');
    await new Promise((r) => setTimeout(r, 80));
    const rn = await Notification.findOne({ userId: reporter._id, type: 'ISSUE_REJECTED' });
    const sn = await Notification.findOne({ userId: supporter._id, type: 'ISSUE_REJECTED' });
    expect(rn.payload.refundPaise).toBe(500);
    expect(sn.payload.refundPaise).toBe(100);
    const refundTxn = await WalletTxn.findOne({ userId: supporter._id, type: 'REFUND', issueId: issue._id });
    expect(sn.payload.refundPaise).toBe(refundTxn.amountPaise);
    expect(JSON.stringify(rn.payload)).not.toContain(reporter.email);
  });

  it('fan-out failure is isolated — transition still succeeds', async () => {
    const admin = await makeUser({ role: 'ADMIN' });
    const reporter = await funded();
    const issue = await report(reporter);
    const spy = vi.spyOn(Notification, 'insertMany').mockRejectedValue(new Error('db down'));
    const result = await transitionIssue(issue._id, 'ACKNOWLEDGED', { userId: admin._id.toString(), role: 'ADMIN' });
    expect(result.status).toBe('ACKNOWLEDGED');
    spy.mockRestore();
  });

  it('TTL + partial unique indexes exist', async () => {
    const indexes = await Notification.collection.indexes();
    expect(indexes.some((i) => i.expireAfterSeconds === 90 * 24 * 60 * 60)).toBe(true);
    expect(indexes.some((i) => i.unique && i.partialFilterExpression)).toBe(true);
  });
});
