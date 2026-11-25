import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import request from 'supertest';

import app from '../../app.js';
import Settings from '../wallet/settings.model.js';
import { ensureDefaultSettings } from '../wallet/wallet.service.js';
import { verifyData } from '../../scripts/verify-data.js';

let replSet;
const j = (r) => r.body;
const signup = async (n) => {
  const res = await request(app).post('/api/auth/register').send({ name: `E2E ${n}`, email: `e2e${n}${Math.random().toString(36).slice(2)}@t.local`, phone: `9${String(Math.floor(Math.random() * 1e9)).padStart(9, '0')}`, password: 'Test@12345' });
  expect(res.status).toBe(201);
  return { token: res.body.data.accessToken, id: res.body.data.user._id };
};
const auth = (t) => ({ Authorization: `Bearer ${t}` });
const issueBody = (ov = {}) => ({ title: 'E2E broken streetlight lane', description: 'The lane streetlight has been dead for two weeks making the area unsafe at night.', category: 'STREETLIGHT', location: { coordinates: [77.5946 + Math.random() * 0.2, 12.9716 + Math.random() * 0.2], city: 'Bengaluru' }, idempotencyKey: `e2e:${Math.random().toString(36).slice(2)}`, ...ov });

beforeAll(async () => {
  replSet = await MongoMemoryReplSet.create({ replSet: { count: 1, storageEngine: 'wiredTiger' } });
  await mongoose.connect(replSet.getUri());
  await ensureDefaultSettings();
}, 300_000);
afterAll(async () => { await mongoose.disconnect(); await replSet?.stop(); });

describe('End-to-end API journey', () => {
  it('signup → topup → report → duplicate → support → tiers → admin → credit → reply → reject → helper → verify', async () => {
    await Settings.updateOne({ key: 'demoMode' }, { $set: { value: false } });
    await Settings.updateOne({ key: 'tier1Paise' }, { $set: { value: 600 } });
    await Settings.updateOne({ key: 'tier2Paise' }, { $set: { value: 1000 } });
    const admin = await signup('admin');
    await mongoose.connection.collection('users').updateOne({ _id: new mongoose.Types.ObjectId(admin.id) }, { $set: { role: 'ADMIN' } });
    const adminToken = (await request(app).post('/api/auth/login').send({ email: (await mongoose.connection.collection('users').findOne({ _id: new mongoose.Types.ObjectId(admin.id) })).email, password: 'Test@12345' })).body.data.accessToken;

    const a = await signup('a'); const b = await signup('b'); const c = await signup('c');
    // signup credit ₹50
    expect((await request(app).get('/api/wallet').set(auth(a.token))).body.data.wallet.balancePaise).toBe(5000);
    // topup
    await request(app).post('/api/wallet/topup').set(auth(a.token)).send({ amountPaise: 10000, idempotencyKey: `tu:${Math.random()}` });
    // report
    const body = issueBody();
    const rep = await request(app).post('/api/issues').set(auth(a.token)).send(body);
    expect(rep.status).toBe(201);
    const issueId = rep.body.data.issue._id;
    // duplicate detected
    const dup = await request(app).post('/api/issues').set(auth(b.token)).send({ ...body, idempotencyKey: `other:${Math.random()}` });
    expect(dup.status).toBe(409);
    expect(dup.body.error.code).toBe('DUPLICATE_FOUND');
    // support → tier 1 (fund 500 + 100 = 600 ≥ tier1 600)
    const s1 = await request(app).post(`/api/issues/${issueId}/support`).set(auth(b.token)).send({ idempotencyKey: `s1:${Math.random()}` });
    expect(s1.body.data.tierUnlocked).toContain(1);
    await request(app).post(`/api/issues/${issueId}/support`).set(auth(c.token)).send({ idempotencyKey: `s2:${Math.random()}` });
    // admin acknowledge
    const ack = await request(app).post(`/api/admin/issues/${issueId}/transition`).set(auth(adminToken)).send({ status: 'ACKNOWLEDGED', note: 'e2e ack' });
    expect(ack.status).toBe(200);
    // platform credit
    const credit = await request(app).post(`/api/admin/issues/${issueId}/credit`).set(auth(adminToken)).send({ amountPaise: 1000, reason: 'e2e boost', idempotencyKey: `cr:${Math.random()}` });
    expect(credit.status).toBe(200);
    // authority reply
    const reply = await request(app).post(`/api/admin/issues/${issueId}/authority-reply`).set(auth(adminToken)).send({ message: 'Repair scheduled for next week.' });
    expect(reply.status).toBe(200);

    // reject another issue with full refunds
    const rep2 = await request(app).post('/api/issues').set(auth(a.token)).send(issueBody());
    const iid2 = rep2.body.data.issue._id;
    await request(app).post(`/api/issues/${iid2}/support`).set(auth(b.token)).send({ idempotencyKey: `s3:${Math.random()}` });
    const rej = await request(app).post(`/api/admin/issues/${iid2}/transition`).set(auth(adminToken)).send({ status: 'REJECTED', note: 'e2e spam rejection' });
    expect(rej.status).toBe(200);

    // helper register → admin verify → search/connect/review
    const h = await signup('helper');
    const hreg = await request(app).post('/api/helpers').set(auth(h.token)).send({ displayName: 'E2E Helper', phone: '9876543210', categories: ['PLUMBER'], bio: 'Experienced plumber serving the neighbourhood with reliable service.', serviceLocation: { coordinates: [77.6, 12.97], city: 'Bengaluru' }, verificationStatus: 'VERIFIED' });
    const helperId = hreg.body.data.helper._id;
    expect(hreg.body.data.helper.verificationStatus).toBe('PENDING');
    await request(app).patch(`/api/admin/helpers/${helperId}`).set(auth(adminToken)).send({ verificationStatus: 'VERIFIED' });
    const search = await request(app).get('/api/helpers/search?lat=12.97&lng=77.6&radiusKm=5');
    expect(search.body.data.items.some((x) => x._id === helperId)).toBe(true);
    await request(app).post(`/api/helpers/${helperId}/connect`).set(auth(a.token));
    const review = await request(app).post(`/api/helpers/${helperId}/review`).set(auth(a.token)).send({ rating: 5, comment: 'Great e2e service' });
    expect(review.status).toBe(201);

    // admin disable user → token rejected
    const dis = await request(app).patch(`/api/admin/users/${c.id}`).set(auth(adminToken)).send({ isActive: false });
    expect(dis.status).toBe(200);
    expect((await request(app).get('/api/wallet').set(auth(c.token))).status).toBe(403);

    // verify:data passes at the end
    const v = await verifyData();
    expect(v.violations).toEqual([]);
    expect(v.ok).toBe(true);
  }, 120_000);
});
