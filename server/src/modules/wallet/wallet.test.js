import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import request from 'supertest';

import app from '../../app.js';
import User from '../users/user.model.js';
import Settings from './settings.model.js';
import Wallet from './wallet.model.js';
import WalletTxn from './walletTxn.model.js';
import {
  chargeWallet,
  ensureDefaultSettings,
  ensureWallet,
  getEffectiveTierThresholds,
  getSetting,
} from './wallet.service.js';
import { createTokenPayload, generateAccessToken } from '../../utils/jwt.util.js';

// Transactions require a replica set — a standalone mongod will not do.
let replSet;

const makeUser = (overrides = {}) =>
  User.create({
    name: 'Test Citizen',
    email: `user${Date.now()}${Math.random().toString(36).slice(2)}@test.local`,
    password: 'Password@123',
    phone: `9${String(Math.floor(Math.random() * 1e9)).padStart(9, '0')}`,
    ...overrides,
  });

const tokenFor = (user) => generateAccessToken(createTokenPayload(user));

beforeAll(async () => {
  replSet = await MongoMemoryReplSet.create({
    replSet: { count: 1, storageEngine: 'wiredTiger' },
  });
  await mongoose.connect(replSet.getUri());
  await ensureDefaultSettings();
});

afterAll(async () => {
  await mongoose.disconnect();
  await replSet?.stop();
});

describe('settings collection', () => {
  it('seeds all defaults idempotently and never overwrites existing values', async () => {
    const before = await Settings.find().lean();
    expect(before.length).toBe(9);

    await Settings.updateOne({ key: 'reportFeePaise' }, { $set: { value: 600 } });
    await ensureDefaultSettings();

    const after = await Settings.find().lean();
    expect(after.length).toBe(9);
    expect(await getSetting('reportFeePaise')).toBe(600);

    // restore for other tests
    await Settings.updateOne({ key: 'reportFeePaise' }, { $set: { value: 500 } });
  });

  it('exposes the documented default fees and thresholds', async () => {
    expect(await getSetting('supportFeePaise')).toBe(100);
    expect(await getSetting('tier1Paise')).toBe(20000);
    expect(await getSetting('tier2Paise')).toBe(50000);
    expect(await getSetting('signupCreditPaise')).toBe(5000);
    expect(await getSetting('duplicateRadiusM')).toBe(100);
    expect(await getSetting('duplicateDays')).toBe(30);
    expect(await getSetting('autoCloseDays')).toBe(7);
    expect(await getSetting('demoMode')).toBe(false);
  });

  it('honours demoMode for effective tier thresholds', async () => {
    expect(await getEffectiveTierThresholds()).toEqual({ tier1Paise: 20000, tier2Paise: 50000 });
    await Settings.updateOne({ key: 'demoMode' }, { $set: { value: true } });
    expect(await getEffectiveTierThresholds()).toEqual({ tier1Paise: 2000, tier2Paise: 5000 });
    await Settings.updateOne({ key: 'demoMode' }, { $set: { value: false } });
  });

  it('signup credit amount is read from settings, not hardcoded', async () => {
    await Settings.updateOne({ key: 'signupCreditPaise' }, { $set: { value: 7000 } });
    const user = await makeUser();
    const wallet = await ensureWallet(user._id);
    expect(wallet.balancePaise).toBe(7000);
    await Settings.updateOne({ key: 'signupCreditPaise' }, { $set: { value: 5000 } });
  });
});

describe('wallet creation & signup credit', () => {
  it('registration creates a wallet with a SIGNUP_CREDIT ledger row', async () => {
    const email = `reg${Date.now()}@test.local`;
    const res = await request(app).post('/api/auth/register').send({
      name: 'New Citizen',
      email,
      password: 'Password@123',
      phone: '9876543210',
    });
    expect(res.status).toBe(201);

    const userId = res.body.data.user._id;
    const wallet = await Wallet.findOne({ userId });
    expect(wallet.balancePaise).toBe(5000);

    const txns = await WalletTxn.find({ userId });
    expect(txns).toHaveLength(1);
    expect(txns[0].type).toBe('SIGNUP_CREDIT');
    expect(txns[0].amountPaise).toBe(5000);
  });

  it('GET /api/wallet lazily creates a wallet for legacy users exactly once', async () => {
    const user = await makeUser();
    const token = tokenFor(user);

    const first = await request(app).get('/api/wallet').set('Authorization', `Bearer ${token}`);
    expect(first.status).toBe(200);
    expect(first.body.success).toBe(true);
    expect(first.body.data.wallet.balancePaise).toBe(5000);
    expect(first.body.data.topupPacksPaise).toEqual([1000, 2000, 5000, 10000]);

    const second = await request(app).get('/api/wallet').set('Authorization', `Bearer ${token}`);
    expect(second.body.data.wallet.balancePaise).toBe(5000);
    expect(await WalletTxn.countDocuments({ userId: user._id, type: 'SIGNUP_CREDIT' })).toBe(1);
  });

  it('rejects unauthenticated wallet access', async () => {
    const res = await request(app).get('/api/wallet');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });
});

describe('idempotency — same key never double-charges', () => {
  let user;
  let token;

  beforeEach(async () => {
    user = await makeUser();
    token = tokenFor(user);
    await ensureWallet(user._id); // balance 5000
  });

  it('repeated top-up with the same idempotencyKey credits only once', async () => {
    const body = { amountPaise: 1000, idempotencyKey: 'test-key-repeat-1' };

    const first = await request(app).post('/api/wallet/topup').set('Authorization', `Bearer ${token}`).send(body);
    expect(first.status).toBe(201);
    expect(first.body.data.wallet.balancePaise).toBe(6000);
    expect(first.body.data.idempotent).toBe(false);

    const second = await request(app).post('/api/wallet/topup').set('Authorization', `Bearer ${token}`).send(body);
    expect(second.status).toBe(200);
    expect(second.body.data.wallet.balancePaise).toBe(6000);
    expect(second.body.data.idempotent).toBe(true);

    expect(await WalletTxn.countDocuments({ userId: user._id, type: 'TOPUP' })).toBe(1);
  });

  it('concurrent double-tap with the same key credits only once', async () => {
    const body = { amountPaise: 2000, idempotencyKey: 'test-key-race-1' };
    const send = () =>
      request(app).post('/api/wallet/topup').set('Authorization', `Bearer ${token}`).send(body);

    const [a, b] = await Promise.all([send(), send()]);
    expect([a.status, b.status].sort()).toEqual([200, 201]);

    const wallet = await Wallet.findOne({ userId: user._id });
    expect(wallet.balancePaise).toBe(7000);
    expect(await WalletTxn.countDocuments({ idempotencyKey: 'test-key-race-1' })).toBe(1);
  });

  it('repeated debit with the same key debits only once', async () => {
    const args = {
      userId: user._id,
      type: 'REPORT_FEE',
      amountPaise: -500,
      idempotencyKey: 'test-key-debit-1',
    };
    await chargeWallet(args);
    const second = await chargeWallet(args);
    expect(second.idempotent).toBe(true);

    const wallet = await Wallet.findOne({ userId: user._id });
    expect(wallet.balancePaise).toBe(4500);
    expect(await WalletTxn.countDocuments({ idempotencyKey: 'test-key-debit-1' })).toBe(1);
  });

  it('rejects invalid top-up packs', async () => {
    const res = await request(app)
      .post('/api/wallet/topup')
      .set('Authorization', `Bearer ${token}`)
      .send({ amountPaise: 1234, idempotencyKey: 'test-key-invalid-pack' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('balance can never go below zero', () => {
  let user;

  beforeEach(async () => {
    user = await makeUser();
    await ensureWallet(user._id); // balance 5000
  });

  it('throws INSUFFICIENT_BALANCE and leaves no trace when debit exceeds balance', async () => {
    await expect(
      chargeWallet({
        userId: user._id,
        type: 'REPORT_FEE',
        amountPaise: -5001,
        idempotencyKey: 'test-key-insufficient-1',
      }),
    ).rejects.toMatchObject({ code: 'INSUFFICIENT_BALANCE', statusCode: 409 });

    const wallet = await Wallet.findOne({ userId: user._id });
    expect(wallet.balancePaise).toBe(5000);
    expect(await WalletTxn.countDocuments({ idempotencyKey: 'test-key-insufficient-1' })).toBe(0);
  });

  it('concurrent debits never overdraw the wallet', async () => {
    // Balance 5000 covers exactly 10 debits of 500. Fire 20 concurrently.
    const results = await Promise.allSettled(
      Array.from({ length: 20 }, (_, i) =>
        chargeWallet({
          userId: user._id,
          type: 'REPORT_FEE',
          amountPaise: -500,
          idempotencyKey: `test-key-concurrent-${i}`,
        }),
      ),
    );

    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected');
    expect(fulfilled).toHaveLength(10);
    expect(rejected).toHaveLength(10);
    rejected.forEach((r) => expect(r.reason.code).toBe('INSUFFICIENT_BALANCE'));

    const wallet = await Wallet.findOne({ userId: user._id });
    expect(wallet.balancePaise).toBe(0);
    expect(await WalletTxn.countDocuments({ userId: user._id, type: 'REPORT_FEE' })).toBe(10);
  });

  it('debit on a missing wallet fails safely without creating a negative wallet', async () => {
    const stranger = await makeUser();
    await expect(
      chargeWallet({
        userId: stranger._id,
        type: 'SUPPORT_FEE',
        amountPaise: -100,
        idempotencyKey: 'test-key-no-wallet-1',
      }),
    ).rejects.toMatchObject({ code: 'INSUFFICIENT_BALANCE' });
    expect(await Wallet.findOne({ userId: stranger._id })).toBeNull();
  });
});

describe('transaction history', () => {
  it('returns paginated, newest-first history scoped to the user', async () => {
    const user = await makeUser();
    const token = tokenFor(user);
    await ensureWallet(user._id);
    for (let i = 0; i < 3; i += 1) {
      await chargeWallet({
        userId: user._id,
        type: 'TOPUP',
        amountPaise: 1000,
        idempotencyKey: `test-key-history-${i}`,
      });
    }

    const other = await makeUser();
    await ensureWallet(other._id);

    const res = await request(app)
      .get('/api/wallet/txns?page=1&limit=2')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.txns).toHaveLength(2);
    expect(res.body.data.pagination).toMatchObject({ page: 1, limit: 2, total: 4, totalPages: 2 });

    const timestamps = res.body.data.txns.map((t) => new Date(t.createdAt).getTime());
    expect(timestamps[0]).toBeGreaterThanOrEqual(timestamps[1]);
    expect(res.body.data.txns.every((t) => t.userId === user._id.toString())).toBe(true);

    const page2 = await request(app)
      .get('/api/wallet/txns?page=2&limit=2')
      .set('Authorization', `Bearer ${token}`);
    expect(page2.body.data.txns).toHaveLength(2);
    expect(page2.body.data.txns.at(-1).type).toBe('SIGNUP_CREDIT');
  });
});