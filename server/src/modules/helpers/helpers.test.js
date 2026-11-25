import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import request from 'supertest';

import app from '../../app.js';
import User from '../users/user.model.js';
import { ensureDefaultSettings, ensureWallet, chargeWallet } from '../wallet/wallet.service.js';
import Wallet from '../wallet/wallet.model.js';
import AuditLog from '../tiers/auditLog.model.js';
import Helper from './helper.model.js';
import Connection from './connection.model.js';
import Review from './review.model.js';
import HelperFlag from './helperFlag.model.js';
import { connectRateLimiter, searchRateLimiter } from './helper.routes.js';
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

const CENTRE = [77.5946, 12.9716];
const helperBody = (overrides = {}) => ({
  displayName: 'Ramesh Plumber',
  phone: '9876543210',
  categories: ['PLUMBER'],
  experienceYears: 5,
  bio: 'Experienced local plumber serving the neighbourhood with reliable and timely service.',
  priceHint: 'From ₹300',
  serviceLocation: { coordinates: CENTRE, address: '42 MG Road', city: 'Bengaluru', state: 'Karnataka', pincode: '560001' },
  radiusKm: 10,
  ...overrides,
});

const makeHelper = async (overrides = {}) => {
  const user = await makeUser({ role: 'HELPER', name: 'Ramesh Kumar' });
  const helper = await Helper.create({
    userId: user._id,
    displayName: 'Ramesh Plumber',
    phone: '9876543210',
    categories: ['PLUMBER'],
    bio: 'Experienced local plumber serving the neighbourhood with reliable and timely service.',
    serviceLocation: { type: 'Point', coordinates: CENTRE, city: 'Bengaluru' },
    verificationStatus: 'VERIFIED',
    radiusKm: 10,
    ...overrides,
  });
  return { user, helper };
};

const registerViaApi = async (user, body) =>
  request(app).post('/api/helpers').set('Authorization', `Bearer ${tokenFor(user)}`).send(body);

const search = (query) => request(app).get(`/api/helpers/search?lat=12.9716&lng=77.5946&${query}`);

beforeAll(async () => {
  replSet = await MongoMemoryReplSet.create({ replSet: { count: 1, storageEngine: 'wiredTiger' } });
  await mongoose.connect(replSet.getUri());
  await ensureDefaultSettings();
}, 300_000);

afterAll(async () => {
  await mongoose.disconnect();
  await replSet?.stop();
});

beforeEach(() => {
  connectRateLimiter.reset();
  searchRateLimiter.reset();
});

describe('Helper onboarding', () => {
  it('creates PENDING; protected fields cannot be self-set; duplicate → 409; ADMIN → 403', async () => {
    const user = await makeUser();
    const res = await registerViaApi(user, { ...helperBody(), verificationStatus: 'VERIFIED', isHidden: false, ratingAvg: 5, connectCount: 99 });
    expect(res.status).toBe(201);
    expect(res.body.data.helper.verificationStatus).toBe('PENDING');
    expect(res.body.data.helper.ratingAvg).toBe(0);
    expect(res.body.data.helper.connectCount).toBe(0);

    const dup = await registerViaApi(user, helperBody());
    expect(dup.status).toBe(409);
    expect(dup.body.error.code).toBe('HELPER_PROFILE_EXISTS');

    const admin = await makeUser({ role: 'ADMIN' });
    const adminRes = await registerViaApi(admin, helperBody());
    expect(adminRes.status).toBe(403);

    const dash = await request(app).get('/api/helpers/me/dashboard').set('Authorization', `Bearer ${tokenFor(user)}`);
    expect(dash.status).toBe(200);
    expect(dash.body.data.helper.phone).toBe('9876543210'); // owner sees phone

    const noProfile = await makeUser();
    const missing = await request(app).get('/api/helpers/me/dashboard').set('Authorization', `Bearer ${tokenFor(noProfile)}`);
    expect(missing.status).toBe(404);
    expect(missing.body.error.code).toBe('HELPER_PROFILE_NOT_FOUND');
  });

  it('non-owner cannot edit; owner PATCH never changes verification/counts', async () => {
    const { user, helper } = await makeHelper();
    const other = await makeUser();
    const otherPatch = await request(app).patch('/api/helpers/me').set('Authorization', `Bearer ${tokenFor(other)}`).send({ displayName: 'Hacked' });
    expect(otherPatch.status).toBe(404); // other user has no profile

    const patch = await request(app).patch('/api/helpers/me').set('Authorization', `Bearer ${tokenFor(user)}`).send({ verificationStatus: 'VERIFIED', ratingAvg: 5, isAvailable: false });
    expect(patch.status).toBe(200);
    expect(patch.body.data.helper.isAvailable).toBe(false);
    expect(patch.body.data.helper.ratingAvg).toBe(0);
    expect((await Helper.findById(helper._id)).verificationStatus).toBe('VERIFIED'); // unchanged by client field
  });

  it('CONTACT_IN_TEXT: phone-like runs and URLs refused in free text', async () => {
    const user = await makeUser();
    for (const bad of [
      { displayName: 'Call 98765 43210 now' },
      { bio: 'Reach me at +91 98765-43210 for quick service anywhere in the city region.' },
      { priceHint: 'Visit http://spam.in' },
      { bio: 'Check www.example.com for my portfolio and past work samples gallery.' },
    ]) {
      const res = await registerViaApi(user, helperBody(bad));
      expect(res.status, JSON.stringify(bad)).toBe(400);
      expect(res.body.error.code).toBe('CONTACT_IN_TEXT');
    }
  });

  it('re-verification: identity changes reset VERIFIED → PENDING; other fields do not', async () => {
    const { user, helper } = await makeHelper();
    const soft = await request(app).patch('/api/helpers/me').set('Authorization', `Bearer ${tokenFor(user)}`).send({ isAvailable: false, priceHint: 'From ₹400' });
    expect(soft.body.data.helper.verificationStatus).toBe('VERIFIED');

    const hard = await request(app).patch('/api/helpers/me').set('Authorization', `Bearer ${tokenFor(user)}`).send({ phone: '9876543211' });
    expect(hard.body.data.helper.verificationStatus).toBe('PENDING');

    await Helper.updateOne({ _id: helper._id }, { $set: { verificationStatus: 'VERIFIED' } });
    const bio = await request(app).patch('/api/helpers/me').set('Authorization', `Bearer ${tokenFor(user)}`).send({ bio: 'Updated bio text that is long enough to pass the minimum length validation.' });
    expect(bio.body.data.helper.verificationStatus).toBe('VERIFIED');
  });
});

describe('$geoNear search', () => {
  it('returns VERIFIED non-hidden within radius, nearest first; exclusions; no phone ever', async () => {
    await makeHelper({ displayName: 'Search Near', serviceLocation: { type: 'Point', coordinates: [77.595, 12.972], city: 'Bengaluru' } });
    await makeHelper({ displayName: 'Search Far', serviceLocation: { type: 'Point', coordinates: [77.61, 12.985], city: 'Bengaluru' } });
    await makeHelper({ displayName: 'Search Pending', verificationStatus: 'PENDING' });
    await makeHelper({ displayName: 'Search Rejected', verificationStatus: 'REJECTED' });
    await makeHelper({ displayName: 'Search Hidden', isHidden: true });
    await makeHelper({ displayName: 'Search Out', serviceLocation: { type: 'Point', coordinates: [77.75, 13.1], city: 'Bengaluru' } });
    await makeHelper({ displayName: 'Search Wrong Cat', categories: ['CAB_AUTO'] });

    const res = await search('radiusKm=5&category=PLUMBER&limit=50');
    expect(res.status).toBe(200);
    const items = res.body.data.items;
    const names = items.map((h) => h.displayName);
    expect(names).toContain('Search Near');
    expect(names).toContain('Search Far');
    expect(names.indexOf('Search Near')).toBeLessThan(names.indexOf('Search Far'));
    for (const excluded of ['Search Pending', 'Search Rejected', 'Search Hidden', 'Search Out', 'Search Wrong Cat']) {
      expect(names).not.toContain(excluded);
    }
    const raw = JSON.stringify(res.body);
    expect(raw).not.toContain('9876543210');
    expect(raw).not.toContain('"phone"');

    const near = items.find((h) => h.displayName === 'Search Near');
    const profile = await request(app).get(`/api/helpers/${near._id}`);
    expect(profile.status).toBe(200);
    expect(JSON.stringify(profile.body)).not.toContain('"phone"');
    expect(profile.body.data.ratingBreakdown).toEqual({ 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 });
  });

  it('helper radiusKm caps visibility even inside the seeker radius (override #5)', async () => {
    // ~4 km north of centre; helper only serves 2 km.
    await makeHelper({
      serviceLocation: { type: 'Point', coordinates: [77.5946, 13.0076], city: 'Bengaluru' },
      radiusKm: 2,
      displayName: 'Far Small Radius',
    });
    const res = await search('radiusKm=10');
    expect(res.body.data.items.some((h) => h.displayName === 'Far Small Radius')).toBe(false);
  });

  it('top-rated sort orders by ratingAvg then ratingCount', async () => {
    await makeHelper({ displayName: 'Low Rated', ratingAvg: 2, ratingCount: 5 });
    await makeHelper({ displayName: 'Top Rated', ratingAvg: 4.8, ratingCount: 9 });
    const res = await search('radiusKm=5&sort=rating&limit=50');
    const names = res.body.data.items.map((h) => h.displayName);
    expect(names.indexOf('Top Rated')).toBeLessThan(names.indexOf('Low Rated'));
  });

  it('route order: static paths are never swallowed by /:helperId', async () => {
    expect((await request(app).get('/api/helpers/meta')).status).toBe(200);
    expect((await search('radiusKm=5')).status).toBe(200);
    const dash = await request(app).get('/api/helpers/me/dashboard');
    expect(dash.status).toBe(401);
    expect(dash.body.error.code).toBe('UNAUTHORIZED');
    const connected = await request(app).get('/api/helpers/mine/connected');
    expect(connected.status).toBe(401);
  });
});

describe('Connect-before-contact', () => {
  it('logs connection, increments distinct connectCount, reveals phone + WhatsApp; re-reveal within 24 h is free', async () => {
    const { helper } = await makeHelper();
    const seeker = await makeUser({ name: 'Asha Verma' });
    const token = tokenFor(seeker);

    const first = await request(app).post(`/api/helpers/${helper._id}/connect`).set('Authorization', `Bearer ${token}`);
    expect(first.status).toBe(200);
    expect(first.body.data.phone).toBe('9876543210');
    expect(first.body.data.whatsappUrl).toContain('https://wa.me/919876543210');
    expect(first.body.data.safetyNoteKey).toBe('local.safetyNote');
    expect(first.body.data.remainingToday).toBe(9);
    expect((await Helper.findById(helper._id)).connectCount).toBe(1);

    const again = await request(app).post(`/api/helpers/${helper._id}/connect`).set('Authorization', `Bearer ${token}`);
    expect(again.status).toBe(200);
    expect(again.body.data.phone).toBe('9876543210');
    expect(await Connection.countDocuments({ seekerId: seeker._id })).toBe(1); // no new row
    expect((await Helper.findById(helper._id)).connectCount).toBe(1); // no increment
    expect(again.body.data.remainingToday).toBe(9); // no quota consumed
  });

  it('isSample helpers: whatsappUrl null + isSample flag', async () => {
    const { helper } = await makeHelper({ isSample: true });
    const seeker = await makeUser();
    const res = await request(app).post(`/api/helpers/${helper._id}/connect`).set('Authorization', `Bearer ${tokenFor(seeker)}`);
    expect(res.body.data.whatsappUrl).toBeNull();
    expect(res.body.data.isSample).toBe(true);
    expect(res.body.data.phone).toBeTruthy();
  });

  it('blocks self-connect, PENDING and hidden helpers', async () => {
    const { user, helper } = await makeHelper();
    const self = await request(app).post(`/api/helpers/${helper._id}/connect`).set('Authorization', `Bearer ${tokenFor(user)}`);
    expect(self.status).toBe(409);
    expect(self.body.error.code).toBe('CANNOT_CONNECT_SELF');

    const pending = await makeHelper({ verificationStatus: 'PENDING' });
    const hidden = await makeHelper({ isHidden: true });
    const seeker = await makeUser();
    for (const target of [pending.helper, hidden.helper]) {
      const res = await request(app).post(`/api/helpers/${target._id}/connect`).set('Authorization', `Bearer ${tokenFor(seeker)}`);
      expect(res.status).toBe(404);
    }
  });

  it('15 parallel connects to different helpers → exactly 10 succeed (override #3c)', async () => {
    const seeker = await makeUser();
    const helpers = [];
    for (let n = 0; n < 15; n += 1) {
      helpers.push((await makeHelper({ displayName: `Parallel ${n}` })).helper);
    }
    const results = await Promise.all(
      helpers.map((h) => request(app).post(`/api/helpers/${h._id}/connect`).set('Authorization', `Bearer ${tokenFor(seeker)}`)),
    );
    const ok = results.filter((r) => r.status === 200);
    const limited = results.filter((r) => r.status === 429);
    expect(ok).toHaveLength(10);
    expect(limited).toHaveLength(5);
    expect(limited.every((r) => r.body.error.code === 'CONNECT_LIMIT_EXCEEDED')).toBe(true);
    expect(await Connection.countDocuments({ seekerId: seeker._id })).toBe(10);
  });

  it('11th sequential connect → 429; dashboard shows FirstName L. and never seeker PII', async () => {
    const seeker = await makeUser({ name: 'Priya Supporter' });
    const helpers = [];
    for (let n = 0; n < 11; n += 1) helpers.push((await makeHelper({ displayName: `Seq ${n}` })).helper);
    const token = tokenFor(seeker);
    for (let n = 0; n < 10; n += 1) {
      expect((await request(app).post(`/api/helpers/${helpers[n]._id}/connect`).set('Authorization', `Bearer ${token}`)).status).toBe(200);
    }
    const eleventh = await request(app).post(`/api/helpers/${helpers[10]._id}/connect`).set('Authorization', `Bearer ${token}`);
    expect(eleventh.status).toBe(429);
    expect(eleventh.body.error.code).toBe('CONNECT_LIMIT_EXCEEDED');

    const dash = await request(app).get('/api/helpers/me/dashboard').set('Authorization', `Bearer ${tokenFor((await Helper.findById(helpers[0]._id)).userId)}`);
    expect(dash.status).toBe(200);
    const raw = JSON.stringify(dash.body);
    expect(raw).toContain('Priya S.');
    expect(raw).not.toContain(seeker.email);
    expect(raw).not.toContain(seeker.phone);
  });
});

describe('Verified reviews', () => {
  it('403 without connect; create updates avg/count; edit recomputes without drift; self blocked', async () => {
    const { user, helper } = await makeHelper();
    const seeker = await makeUser();
    const token = tokenFor(seeker);

    const early = await request(app).post(`/api/helpers/${helper._id}/review`).set('Authorization', `Bearer ${token}`).send({ rating: 5 });
    expect(early.status).toBe(403);
    expect(early.body.error.code).toBe('CONNECTION_REQUIRED');

    await request(app).post(`/api/helpers/${helper._id}/connect`).set('Authorization', `Bearer ${token}`);
    const created = await request(app).post(`/api/helpers/${helper._id}/review`).set('Authorization', `Bearer ${token}`).send({ rating: 4, comment: 'Good work' });
    expect(created.status).toBe(201);
    expect(created.body.data.ratingAvg).toBe(4);
    expect(created.body.data.ratingCount).toBe(1);

    const edited = await request(app).post(`/api/helpers/${helper._id}/review`).set('Authorization', `Bearer ${token}`).send({ rating: 2, comment: 'Changed my mind' });
    expect(edited.status).toBe(200);
    expect(edited.body.data.updated).toBe(true);
    expect(edited.body.data.ratingAvg).toBe(2);
    expect(edited.body.data.ratingCount).toBe(1); // no drift

    const second = await makeUser();
    await request(app).post(`/api/helpers/${helper._id}/connect`).set('Authorization', `Bearer ${tokenFor(second)}`);
    await request(app).post(`/api/helpers/${helper._id}/review`).set('Authorization', `Bearer ${tokenFor(second)}`).send({ rating: 5 });
    const refreshed = await Helper.findById(helper._id);
    expect(refreshed.ratingAvg).toBe(3.5); // (2+5)/2
    expect(refreshed.ratingCount).toBe(2);

    const self = await request(app).post(`/api/helpers/${helper._id}/review`).set('Authorization', `Bearer ${tokenFor(user)}`).send({ rating: 5 });
    expect(self.status).toBe(409);
    expect(self.body.error.code).toBe('CANNOT_REVIEW_SELF');

    const contact = await request(app).post(`/api/helpers/${helper._id}/review`).set('Authorization', `Bearer ${token}`).send({ rating: 5, comment: 'Call me on 9876543210' });
    expect(contact.status).toBe(400);
    expect(contact.body.error.code).toBe('CONTACT_IN_TEXT');
  });
});

describe('Flagging and admin queue', () => {
  it('3 distinct flags auto-hide + audit; duplicate → 409; admin unhide dismisses flags', async () => {
    const { helper } = await makeHelper();
    const flaggers = await Promise.all([makeUser(), makeUser(), makeUser()]);

    const first = await request(app).post(`/api/helpers/${helper._id}/flag`).set('Authorization', `Bearer ${tokenFor(flaggers[0])}`).send({ reason: 'Suspicious behaviour' });
    expect(first.body.data.isHidden).toBe(false);
    const dup = await request(app).post(`/api/helpers/${helper._id}/flag`).set('Authorization', `Bearer ${tokenFor(flaggers[0])}`).send({ reason: 'Again suspicious' });
    expect(dup.status).toBe(409);
    expect(dup.body.error.code).toBe('ALREADY_FLAGGED');

    await request(app).post(`/api/helpers/${helper._id}/flag`).set('Authorization', `Bearer ${tokenFor(flaggers[1])}`).send({ reason: 'Asked for advance payment' });
    expect((await Helper.findById(helper._id)).isHidden).toBe(false);

    const third = await request(app).post(`/api/helpers/${helper._id}/flag`).set('Authorization', `Bearer ${tokenFor(flaggers[2])}`).send({ reason: 'Fake profile details' });
    expect(third.body.data.isHidden).toBe(true);
    expect((await Helper.findById(helper._id)).isHidden).toBe(true);
    expect(await AuditLog.countDocuments({ action: 'HELPER_AUTO_HIDDEN' })).toBe(1);
    expect((await search('radiusKm=5')).body.data.items.some((h) => h._id === String(helper._id))).toBe(false);

    const admin = await makeUser({ role: 'ADMIN' });
    const unhide = await request(app).patch(`/api/admin/helpers/${helper._id}`).set('Authorization', `Bearer ${tokenFor(admin)}`).send({ isHidden: false });
    expect(unhide.status).toBe(200);
    expect(unhide.body.data.helper.isHidden).toBe(false);
    expect(unhide.body.data.helper.flagCount).toBe(0);
    expect(await HelperFlag.countDocuments({ helperId: helper._id, dismissed: false })).toBe(0);
    expect((await search('radiusKm=5')).body.data.items.some((h) => h._id === String(helper._id))).toBe(true);
  });

  it('admin RBAC matrix + verify/reject with audit before/after (3 fields only)', async () => {
    const { helper } = await makeHelper({ verificationStatus: 'PENDING' });
    const citizen = await makeUser();
    const admin = await makeUser({ role: 'ADMIN' });

    expect((await request(app).get('/api/admin/helpers')).status).toBe(401);
    expect((await request(app).get('/api/admin/helpers').set('Authorization', `Bearer ${tokenFor(citizen)}`)).status).toBe(403);
    expect((await request(app).patch(`/api/admin/helpers/${helper._id}`).set('Authorization', `Bearer ${tokenFor(citizen)}`).send({ verificationStatus: 'VERIFIED' })).status).toBe(403);

    const list = await request(app).get('/api/admin/helpers?verificationStatus=PENDING').set('Authorization', `Bearer ${tokenFor(admin)}`);
    expect(list.status).toBe(200);

    const verify = await request(app).patch(`/api/admin/helpers/${helper._id}`).set('Authorization', `Bearer ${tokenFor(admin)}`).send({ verificationStatus: 'VERIFIED' });
    expect(verify.status).toBe(200);
    expect(verify.body.data.helper.verificationStatus).toBe('VERIFIED');

    const reject = await request(app).patch(`/api/admin/helpers/${helper._id}`).set('Authorization', `Bearer ${tokenFor(admin)}`).send({ verificationStatus: 'REJECTED', rejectionReason: 'Invalid documents' });
    expect(reject.body.data.helper.verificationStatus).toBe('REJECTED');
    expect(reject.body.data.helper.rejectionReason).toBe('Invalid documents');

    const audit = await AuditLog.findOne({ action: 'HELPER_ADMIN_PATCH', 'meta.helperId': String(helper._id) }).sort({ createdAt: -1 });
    expect(Object.keys(audit.meta.before).sort()).toEqual(['isHidden', 'rejectionReason', 'verificationStatus']);
    expect(Object.keys(audit.meta.after).sort()).toEqual(['isHidden', 'rejectionReason', 'verificationStatus']);
    expect(JSON.stringify(audit.meta)).not.toContain('phone');
  });
});

describe('Role compatibility (override #1)', () => {
  it('a HELPER-role user can still report and support Global issues', async () => {
    const helperUser = await makeUser({ role: 'HELPER' });
    await ensureWallet(helperUser._id);
    await chargeWallet({ userId: helperUser._id, type: 'TOPUP', amountPaise: 10000, idempotencyKey: `seed:${helperUser._id}` });

    const report = await request(app)
      .post('/api/issues')
      .set('Authorization', `Bearer ${tokenFor(helperUser)}`)
      .send({
        title: 'Water pipe leakage near market',
        description: 'A major pipe leak is wasting water and flooding the lane near the vegetable market every morning.',
        category: 'WATER',
        location: { coordinates: [77.6 + Math.random() * 0.1, 12.95 + Math.random() * 0.1], city: 'Bengaluru' },
        idempotencyKey: `report:helper-role-${Date.now()}`,
      });
    expect(report.status).toBe(201);

    const citizen = await makeUser();
    await ensureWallet(citizen._id);
    const otherIssue = await request(app)
      .post('/api/issues')
      .set('Authorization', `Bearer ${tokenFor(citizen)}`)
      .send({
        title: 'Streetlight dead on 5th cross',
        description: 'The streetlight at the 5th cross junction has been dead for a week making the area unsafe at night.',
        category: 'STREETLIGHT',
        location: { coordinates: [77.7 + Math.random() * 0.1, 13.0 + Math.random() * 0.1], city: 'Bengaluru' },
        idempotencyKey: `report:citizen-${Date.now()}`,
      });
    const support = await request(app)
      .post(`/api/issues/${otherIssue.body.data.issue._id}/support`)
      .set('Authorization', `Bearer ${tokenFor(helperUser)}`)
      .send({ idempotencyKey: `support:helper-role-${Date.now()}` });
    expect(support.status).toBe(201);
    expect((await Wallet.findOne({ userId: helperUser._id })).balancePaise).toBe(14400);
  });

  it('mine/connected lists deduped helpers with review state, never phone', async () => {
    const { helper } = await makeHelper();
    const seeker = await makeUser();
    const token = tokenFor(seeker);
    await request(app).post(`/api/helpers/${helper._id}/connect`).set('Authorization', `Bearer ${token}`);
    await request(app).post(`/api/helpers/${helper._id}/connect`).set('Authorization', `Bearer ${token}`);

    const res = await request(app).get('/api/helpers/mine/connected').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.items).toHaveLength(1);
    expect(res.body.data.items[0].hasReviewed).toBe(false);
    expect(res.body.data.items[0].lastConnectedAt).toBeTruthy();
    expect(JSON.stringify(res.body)).not.toContain('"phone"');
  });
});

describe('Phase 7.1 hardening', () => {
  it('obfuscated digits (Devanagari / Arabic-Indic / zero-width) → CONTACT_IN_TEXT on POST and PATCH', async () => {
    const user = await makeUser();
    const devanagari = await registerViaApi(user, helperBody({ bio: 'संपर्क करें ९८७६५४३२१० पर कभी भी सेवा के लिए उपलब्ध हूँ मैं।' }));
    expect(devanagari.status).toBe(400);
    expect(devanagari.body.error.code).toBe('CONTACT_IN_TEXT');

    const arabic = await registerViaApi(user, helperBody({ bio: 'Call me on ٩٨٧٦٥٤٣٢١٠ for any plumbing work in the area.' }));
    expect(arabic.status).toBe(400);
    expect(arabic.body.error.code).toBe('CONTACT_IN_TEXT');

    const { user: owner } = await makeHelper();
    const zw = await request(app).patch('/api/helpers/me').set('Authorization', `Bearer ${tokenFor(owner)}`).send({ bio: 'Reach 9\u200B8\u200B7\u200B6\u200B5\u200B4\u200B3\u200B2\u200B1\u200B0 anytime for service.' });
    expect(zw.status).toBe(400);
    expect(zw.body.error.code).toBe('CONTACT_IN_TEXT');
  });

  it('GET /helpers/:id honours page/limit for reviews', async () => {
    const { helper } = await makeHelper();
    for (let n = 0; n < 2; n += 1) {
      const seeker = await makeUser();
      await request(app).post(`/api/helpers/${helper._id}/connect`).set('Authorization', `Bearer ${tokenFor(seeker)}`);
      await request(app).post(`/api/helpers/${helper._id}/review`).set('Authorization', `Bearer ${tokenFor(seeker)}`).send({ rating: 4 + n, comment: `Review number ${n}` });
    }
    const page2 = await request(app).get(`/api/helpers/${helper._id}?page=2&limit=1`);
    expect(page2.status).toBe(200);
    expect(page2.body.data.reviews.items).toHaveLength(1);
    expect(page2.body.data.reviews.pagination).toMatchObject({ page: 2, limit: 1, total: 2, totalPages: 2 });
    const page1 = await request(app).get(`/api/helpers/${helper._id}?page=1&limit=1`);
    expect(page1.body.data.reviews.items[0]._id).not.toBe(page2.body.data.reviews.items[0]._id);
  });

  it('parallel registrations → one 201 + one 409, never 500; parallel first reviews → one 201 + one 200', async () => {
    const user = await makeUser();
    const regs = await Promise.all([registerViaApi(user, helperBody()), registerViaApi(user, helperBody())]);
    expect(regs.map((r) => r.status).sort()).toEqual([201, 409]);
    expect(regs.every((r) => r.status !== 500)).toBe(true);

    const { helper } = await makeHelper();
    const seeker = await makeUser();
    const token = tokenFor(seeker);
    await request(app).post(`/api/helpers/${helper._id}/connect`).set('Authorization', `Bearer ${token}`);
    const reviews = await Promise.all([
      request(app).post(`/api/helpers/${helper._id}/review`).set('Authorization', `Bearer ${token}`).send({ rating: 5 }),
      request(app).post(`/api/helpers/${helper._id}/review`).set('Authorization', `Bearer ${token}`).send({ rating: 3 }),
    ]);
    expect(reviews.map((r) => r.status).sort()).toEqual([200, 201]);
    expect(reviews.every((r) => r.status !== 500)).toBe(true);
    expect((await Helper.findById(helper._id)).ratingCount).toBe(1);
    expect(await Review.countDocuments({ helperId: helper._id })).toBe(1);
  });

  it('REJECTED helper resubmission: identity/bio change → PENDING + reason cleared; other fields stay REJECTED', async () => {
    const { user, helper } = await makeHelper({ verificationStatus: 'REJECTED', rejectionReason: 'Invalid documents' });
    const token = tokenFor(user);

    const soft = await request(app).patch('/api/helpers/me').set('Authorization', `Bearer ${token}`).send({ priceHint: 'From ₹350' });
    expect(soft.body.data.helper.verificationStatus).toBe('REJECTED');

    const resubmit = await request(app).patch('/api/helpers/me').set('Authorization', `Bearer ${token}`).send({ bio: 'Corrected bio with verified details and enough length to pass validation checks.' });
    expect(resubmit.body.data.helper.verificationStatus).toBe('PENDING');
    expect(resubmit.body.data.helper.rejectionReason).toBe('');
    expect((await Helper.findById(helper._id)).rejectionReason).toBe('');
  });

  it('normalised comparison: unchanged location/categories re-send keeps VERIFIED; real changes reset', async () => {
    const { user } = await makeHelper();
    const token = tokenFor(user);

    const same = await request(app).patch('/api/helpers/me').set('Authorization', `Bearer ${token}`).send({
      serviceLocation: { coordinates: [77.59460000001, 12.9716], address: '', city: 'Bengaluru' },
      categories: ['PLUMBER'],
    });
    expect(same.body.data.helper.verificationStatus).toBe('VERIFIED');

    const moved = await request(app).patch('/api/helpers/me').set('Authorization', `Bearer ${token}`).send({
      serviceLocation: { coordinates: [77.61, 12.99], city: 'Bengaluru' },
    });
    expect(moved.body.data.helper.verificationStatus).toBe('PENDING');

    await Helper.updateOne({ userId: user._id }, { $set: { verificationStatus: 'VERIFIED' } });
    const renamed = await request(app).patch('/api/helpers/me').set('Authorization', `Bearer ${token}`).send({ displayName: 'New Name Services' });
    expect(renamed.body.data.helper.verificationStatus).toBe('PENDING');
  });

  it('connect per-IP limit: 21st request in a minute → 429 RATE_LIMITED', async () => {
    const { helper } = await makeHelper();
    const seekers = await Promise.all(Array.from({ length: 21 }, () => makeUser()));
    const statuses = [];
    for (const seeker of seekers) {
      const res = await request(app).post(`/api/helpers/${helper._id}/connect`).set('Authorization', `Bearer ${tokenFor(seeker)}`);
      statuses.push({ status: res.status, code: res.body.error?.code });
    }
    expect(statuses.slice(0, 20).every((s) => s.status === 200)).toBe(true);
    expect(statuses[20].status).toBe(429);
    expect(statuses[20].code).toBe('RATE_LIMITED');
  });

  it('public GET of PENDING/hidden helper → 404; owner and admin → 200', async () => {
    const admin = await makeUser({ role: 'ADMIN' });
    const pending = await makeHelper({ verificationStatus: 'PENDING' });
    const hidden = await makeHelper({ isHidden: true });

    for (const { user, helper } of [pending, hidden]) {
      expect((await request(app).get(`/api/helpers/${helper._id}`)).status).toBe(404);
      const owner = await request(app).get(`/api/helpers/${helper._id}`).set('Authorization', `Bearer ${tokenFor(user)}`);
      expect(owner.status).toBe(200);
      const asAdmin = await request(app).get(`/api/helpers/${helper._id}`).set('Authorization', `Bearer ${tokenFor(admin)}`);
      expect(asAdmin.status).toBe(200);
    }
  });
});
