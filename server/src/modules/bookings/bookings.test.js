import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import request from 'supertest';

import app from '../../app.js';
import User from '../users/user.model.js';
import Helper from '../helpers/helper.model.js';
import Booking from './booking.model.js';
import Issue from '../issues/issue.model.js';
import Wallet from '../wallet/wallet.model.js';
import WalletTxn from '../wallet/walletTxn.model.js';
import AuditLog from '../tiers/auditLog.model.js';
import Notification from '../notifications/notification.model.js';
import { chargeWallet, ensureDefaultSettings, ensureWallet } from '../wallet/wallet.service.js';
import { createTokenPayload, generateAccessToken } from '../../utils/jwt.util.js';

let replSet;

const randPhone = () => `9${String(Math.floor(Math.random() * 1e9)).padStart(9, '0')}`;
const randEmail = () => `t${Date.now()}${Math.random().toString(36).slice(2)}@test.local`;

const makeFundedUser = async ({ role = 'CONSUMER', balancePaise = 100000 } = {}) => {
  const user = await User.create({
    name: `${role} Test`,
    email: randEmail(),
    password: 'Password@123',
    phone: randPhone(),
    role,
  });
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

const tokenFor = (user) => generateAccessToken(createTokenPayload(user));

const makeProviderListing = async ({ balancePaise = 5000 } = {}) => {
  const providerUser = await makeFundedUser({ role: 'PROVIDER', balancePaise });
  const helper = await Helper.create({
    userId: providerUser._id,
    displayName: 'Metro Appliance Care',
    phone: randPhone(),
    categories: ['APPLIANCE_REPAIR'],
    experienceYears: 6,
    bio: 'Reliable AC, fridge and washing machine repairs across the city.',
    priceHint: '₹400 visit',
    basePricePaise: 40000,
    serviceLocation: {
      type: 'Point',
      coordinates: [77.5946, 12.9716],
      city: 'Bengaluru',
      state: 'Karnataka',
      pincode: '560001',
    },
    radiusKm: 10,
    verificationStatus: 'VERIFIED',
    isAvailable: true,
    isHidden: false,
  });
  return { providerUser, helper };
};

beforeAll(async () => {
  replSet = await MongoMemoryReplSet.create({ replSet: { count: 1, storageEngine: 'wiredTiger' } });
  await mongoose.connect(replSet.getUri());
  await Promise.all([Issue.init(), Helper.init(), Booking.init()]);
  await ensureDefaultSettings();
}, 300_000);

afterAll(async () => {
  await mongoose.disconnect();
  await replSet?.stop();
});

describe('Consumer & Provider roles normalization', () => {
  it('registers CONSUMER/PROVIDER directly and maps legacy CITIZEN/HELPER cleanly', async () => {
    const consumerRes = await request(app).post('/api/auth/register').send({
      name: 'Demo Consumer User',
      email: randEmail(),
      password: 'Password@123',
      phone: randPhone(),
      role: 'CONSUMER',
    });
    expect(consumerRes.status).toBe(201);
    expect(consumerRes.body.data.user.role).toBe('CONSUMER');

    const legacyHelper = await User.create({
      name: 'Legacy Helper',
      email: randEmail(),
      password: 'Password@123',
      phone: randPhone(),
      role: 'HELPER',
    });
    expect(legacyHelper.role).toBe('PROVIDER');
  });
});

describe('Local service bookings & platform commission lifecycle', () => {
  it('enforces auth, blocks self-booking and insufficient wallet balance', async () => {
    const { providerUser, helper } = await makeProviderListing();
    const payload = {
      helperId: String(helper._id),
      category: 'APPLIANCE_REPAIR',
      serviceTitle: 'Split AC jet servicing',
      scheduledDate: '2026-12-01',
      timeSlot: '10:00 AM - 12:00 PM',
      serviceAddress: { address: '42 MG Road Indiranagar', city: 'Bengaluru', state: 'Karnataka', pincode: '560038' },
      idempotencyKey: `bk:${Math.random().toString(36).slice(2)}`,
    };

    expect((await request(app).post('/api/bookings').send(payload)).status).toBe(401);

    const selfBook = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${tokenFor(providerUser)}`)
      .send(payload);
    expect(selfBook.status).toBe(409);
    expect(selfBook.body.error.code).toBe('CANNOT_BOOK_SELF');

    const poorConsumer = await makeFundedUser({ balancePaise: 5000 });
    const brokeBook = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${tokenFor(poorConsumer)}`)
      .send(payload);
    expect(brokeBook.status).toBe(409);
    expect(brokeBook.body.error.code).toBe('INSUFFICIENT_BALANCE');
    expect(await Booking.countDocuments({ consumerId: poorConsumer._id })).toBe(0);
  });

  it('holds wallet funds atomically, handles idempotency, settles payout & commission on completion', async () => {
    const consumer = await makeFundedUser({ balancePaise: 100000 });
    const { providerUser, helper } = await makeProviderListing({ balancePaise: 5000 });
    const admin = await makeFundedUser({ role: 'ADMIN' });
    const key = `bk:${Math.random().toString(36).slice(2)}`;

    const body = {
      helperId: String(helper._id),
      category: 'APPLIANCE_REPAIR',
      serviceTitle: 'Washing machine drum check',
      scheduledDate: '2026-12-05',
      timeSlot: '02:00 PM - 04:00 PM',
      serviceAddress: { address: '18 Indiranagar 100ft Rd', city: 'Bengaluru', state: 'Karnataka', pincode: '560038' },
      notes: 'Front-load model making vibration noise',
      idempotencyKey: key,
    };

    const createRes = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${tokenFor(consumer)}`)
      .send(body);
    expect(createRes.status).toBe(201);
    const booking = createRes.body.data.booking;
    expect(booking.amountPaise).toBe(40000);
    expect(booking.commissionRatePercent).toBe(10);
    expect(booking.commissionPaise).toBe(4000);
    expect(booking.providerPayoutPaise).toBe(36000);
    expect(booking.status).toBe('PENDING');
    expect(booking.paymentStatus).toBe('HELD');

    const consumerWalletAfterHold = await Wallet.findOne({ userId: consumer._id });
    expect(consumerWalletAfterHold.balancePaise).toBe(60000);

    // Replay same idempotencyKey -> returns existing booking without charging again
    const replayRes = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${tokenFor(consumer)}`)
      .send(body);
    expect(replayRes.status).toBe(200);
    expect(replayRes.body.data.idempotent).toBe(true);
    expect((await Wallet.findOne({ userId: consumer._id })).balancePaise).toBe(60000);

    // Consumer mine & provider dashboard views
    const mineRes = await request(app).get('/api/bookings/mine').set('Authorization', `Bearer ${tokenFor(consumer)}`);
    expect(mineRes.status).toBe(200);
    expect(mineRes.body.data.items.some((b) => b._id === booking._id)).toBe(true);

    const provRes = await request(app).get('/api/bookings/provider').set('Authorization', `Bearer ${tokenFor(providerUser)}`);
    expect(provRes.status).toBe(200);
    expect(provRes.body.data.items.some((b) => b._id === booking._id)).toBe(true);

    // Provider lifecycle: PENDING -> ACCEPTED -> IN_PROGRESS -> COMPLETED
    for (const status of ['ACCEPTED', 'IN_PROGRESS', 'COMPLETED']) {
      const tr = await request(app)
        .post(`/api/bookings/${booking._id}/transition`)
        .set('Authorization', `Bearer ${tokenFor(providerUser)}`)
        .send({ status, note: `Moved to ${status}` });
      expect(tr.status).toBe(200);
      expect(tr.body.data.booking.status).toBe(status);
    }

    const settled = await Booking.findById(booking._id).lean();
    expect(settled.paymentStatus).toBe('SETTLED');

    const providerWallet = await Wallet.findOne({ userId: providerUser._id });
    expect(providerWallet.balancePaise).toBe(5000 + 36000);

    const updatedHelper = await Helper.findById(helper._id);
    expect(updatedHelper.bookingCount).toBe(1);
    expect(updatedHelper.totalEarningsPaise).toBe(36000);

    const audit = await AuditLog.findOne({ action: 'BOOKING_COMPLETED_COMMISSION', entityId: String(booking._id) });
    expect(audit).toBeTruthy();
    expect(audit.meta.commissionPaise).toBe(4000);

    const dash = await request(app).get('/api/admin/dashboard?days=7').set('Authorization', `Bearer ${tokenFor(admin)}`);
    expect(dash.status).toBe(200);
    expect(dash.body.data.local.totalCommissionPaise).toBeGreaterThanOrEqual(4000);
    expect(dash.body.data.local.completedBookings).toBeGreaterThanOrEqual(1);
  });

  it('refunds consumer wallet atomically when consumer cancels an ACCEPTED booking', async () => {
    const consumer = await makeFundedUser({ balancePaise: 100000 });
    const { providerUser, helper } = await makeProviderListing();

    const created = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${tokenFor(consumer)}`)
      .send({
        helperId: String(helper._id),
        category: 'APPLIANCE_REPAIR',
        serviceTitle: 'Refrigerator compressor check',
        scheduledDate: '2026-12-09',
        timeSlot: '04:00 PM - 06:00 PM',
        serviceAddress: { address: '7 Church Street', city: 'Bengaluru', state: 'Karnataka', pincode: '560001' },
        idempotencyKey: `bk:${Math.random().toString(36).slice(2)}`,
      });
    const bookingId = created.body.data.booking._id;
    expect((await Wallet.findOne({ userId: consumer._id })).balancePaise).toBe(60000);

    await request(app)
      .post(`/api/bookings/${bookingId}/transition`)
      .set('Authorization', `Bearer ${tokenFor(providerUser)}`)
      .send({ status: 'ACCEPTED' });

    const cancelRes = await request(app)
      .post(`/api/bookings/${bookingId}/transition`)
      .set('Authorization', `Bearer ${tokenFor(consumer)}`)
      .send({ status: 'CANCELLED', note: 'Rescheduling needed' });
    expect(cancelRes.status).toBe(200);
    expect(cancelRes.body.data.booking.status).toBe('CANCELLED');
    expect(cancelRes.body.data.booking.paymentStatus).toBe('REFUNDED');

    expect((await Wallet.findOne({ userId: consumer._id })).balancePaise).toBe(100000);
    const refundTxn = await WalletTxn.findOne({ bookingId, type: 'BOOKING_REFUND' });
    expect(refundTxn.amountPaise).toBe(40000);
  });
});

describe('Global Mode: Dynamic importance limits, Pool Funds, Resolution & India States', () => {
  it('assigns SMALL/MEDIUM/LARGE thresholds dynamically and triggers EXPLOSION_TRIGGERED at limit', async () => {
    const reporter = await makeFundedUser({ balancePaise: 50000 });
    const resSmall = await request(app)
      .post('/api/issues')
      .set('Authorization', `Bearer ${tokenFor(reporter)}`)
      .send({
        title: 'Broken culvert cover near Sector 18 market',
        description: 'Open drain cover poses a daily hazard to pedestrians and two-wheelers.',
        category: 'BROKEN_ROADS',
        issueType: 'SOCIAL_EXPLOSION',
        importance: 'SMALL',
        location: { coordinates: [77.321, 28.57], address: 'Sector 18', city: 'Noida', state: 'Uttar Pradesh', pincode: '201301' },
        idempotencyKey: `exp:${Math.random().toString(36).slice(2)}`,
      });
    expect(resSmall.status).toBe(201);
    const smallIssue = resSmall.body.data.issue;
    expect(smallIssue.thresholdTarget).toBe(5);
    expect(smallIssue.explosionTriggered).toBe(false);

    const resLarge = await request(app)
      .post('/api/issues')
      .set('Authorization', `Bearer ${tokenFor(reporter)}`)
      .send({
        title: 'Establish AIIMS satellite medical campus for Bundelkhand region',
        description: 'Citizens currently travel over 220 km for tertiary trauma and oncology care.',
        category: 'PUBLIC_FACILITIES',
        issueType: 'SOCIAL_EXPLOSION',
        importance: 'LARGE',
        location: { coordinates: [78.5685, 25.4484], address: 'Civil Lines', city: 'Jhansi', state: 'Uttar Pradesh', pincode: '284001' },
        idempotencyKey: `exp:${Math.random().toString(36).slice(2)}`,
      });
    expect(resLarge.status).toBe(201);
    expect(resLarge.body.data.issue.thresholdTarget).toBe(30);

    // 4 additional supporters push supporterCount from 1 -> 5 == smallIssueThreshold
    const supporters = await Promise.all([1, 2, 3, 4].map(() => makeFundedUser({ balancePaise: 10000 })));
    let lastSupport;
    for (const s of supporters) {
      lastSupport = await request(app)
        .post(`/api/issues/${smallIssue._id}/support`)
        .set('Authorization', `Bearer ${tokenFor(s)}`)
        .send({ idempotencyKey: `sup:${Math.random().toString(36).slice(2)}` });
      expect(lastSupport.status).toBe(201);
    }
    expect(lastSupport.body.data.explosionTriggered).toBe(true);
    const reloaded = await Issue.findById(smallIssue._id).lean();
    expect(reloaded.explosionTriggered).toBe(true);
    expect(reloaded.supporterCount).toBe(5);
    expect(await AuditLog.countDocuments({ action: 'EXPLOSION_TRIGGERED', issueId: smallIssue._id })).toBe(1);
    let notifCount = 0;
    for (let attempt = 0; attempt < 20 && notifCount === 0; attempt++) {
      notifCount = await Notification.countDocuments({ userId: reporter._id, type: 'EXPLOSION_TRIGGERED' });
      if (notifCount === 0) await new Promise((r) => setTimeout(r, 50));
    }
    expect(notifCount).toBeGreaterThanOrEqual(1);
  });

  it('tracks POOL_FUNDS utilization, NGO resolution promotion, partner stats & 36 India states/UTs', async () => {
    const reporter = await makeFundedUser({ balancePaise: 100000 });
    const contributor = await makeFundedUser({ balancePaise: 100000 });

    const createPool = await request(app)
      .post('/api/issues')
      .set('Authorization', `Bearer ${tokenFor(reporter)}`)
      .send({
        title: 'Solar streetlamps for rural girls hostel road in Sikar',
        description: 'Installing 6 battery-backed solar LED poles along the 800m hostel approach road.',
        category: 'EDUCATION_INFRA',
        issueType: 'POOL_FUNDS',
        importance: 'SMALL',
        fundingGoalPaise: 30000,
        responsibleParty: { type: 'NGO', name: 'Gramin Jyoti Foundation', contactRole: 'Field Coordinator', note: 'District solar partner' },
        location: { coordinates: [75.1398, 27.6094], address: 'College Link Rd', city: 'Sikar', state: 'Rajasthan', pincode: '332001' },
        idempotencyKey: `pool:${Math.random().toString(36).slice(2)}`,
      });
    expect(createPool.status).toBe(201);
    const poolIssue = createPool.body.data.issue;
    expect(poolIssue.fundingGoalPaise).toBe(30000);

    const contribRes = await request(app)
      .post(`/api/issues/${poolIssue._id}/support`)
      .set('Authorization', `Bearer ${tokenFor(contributor)}`)
      .send({ amountPaise: 30000, idempotencyKey: `poolc:${Math.random().toString(36).slice(2)}` });
    expect(contribRes.status).toBe(201);
    expect(contribRes.body.data.explosionTriggered).toBe(true);

    const utilRes = await request(app)
      .post(`/api/issues/${poolIssue._id}/utilization`)
      .set('Authorization', `Bearer ${tokenFor(reporter)}`)
      .send({ item: '6x 40W Solar LED Poles', amountPaise: 24000, note: 'Installed with dusk sensors' });
    expect(utilRes.status).toBe(200);
    expect(utilRes.body.data.issue.fundUtilization).toHaveLength(1);

    const resolveRes = await request(app)
      .post(`/api/issues/${poolIssue._id}/resolve`)
      .set('Authorization', `Bearer ${tokenFor(reporter)}`)
      .send({
        solverType: 'NGO',
        organizationName: 'Gramin Jyoti Foundation',
        departmentOrLead: 'Clean Energy Wing',
        resolutionDetails: 'Installed and commissioned all six solar LED poles along the hostel stretch.',
        impactSummary: '450 students benefit from lit evening transit.',
        promotion: { enabled: true, tagline: 'Lighting rural India cleanly', badgeText: 'Verified NGO Partner', websiteUrl: 'https://example.org/gramin' },
      });
    expect(resolveRes.status).toBe(200);
    expect(resolveRes.body.data.issue.status).toBe('RESOLVED');
    expect(resolveRes.body.data.issue.resolution.organizationName).toBe('Gramin Jyoti Foundation');

    const partnersRes = await request(app).get('/api/issues/stats/partners');
    expect(partnersRes.status).toBe(200);
    expect(partnersRes.body.data.partners.some((p) => p.organizationName === 'Gramin Jyoti Foundation')).toBe(true);

    const locRes = await request(app).get('/api/issues/stats/locations?state=Rajasthan');
    expect(locRes.status).toBe(200);
    expect(locRes.body.data.overview.totalStatesAndUts).toBe(36);
    expect(locRes.body.data.states).toHaveLength(36);
    const raj = locRes.body.data.states.find((s) => s.state === 'Rajasthan');
    expect(raj.total).toBeGreaterThanOrEqual(1);
    expect(raj.resolved).toBeGreaterThanOrEqual(1);
  });
});
