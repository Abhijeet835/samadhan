import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import mongoose from 'mongoose';

import { connectDB } from '../../config/db.js';
import Wallet from '../wallet/wallet.model.js';
import WalletTxn from '../wallet/walletTxn.model.js';
import Issue from '../issues/issue.model.js';
import IssueSupport from '../issues/issueSupport.model.js';
import Helper from '../helpers/helper.model.js';
import Review from '../helpers/review.model.js';
import User from '../users/user.model.js';
import { verifyData } from '../../scripts/verify-data.js';

let replSet;
beforeAll(async () => {
  replSet = await MongoMemoryReplSet.create({ replSet: { count: 1, storageEngine: 'wiredTiger' } });
  await mongoose.connect(replSet.getUri());
}, 300_000);
afterAll(async () => { await mongoose.disconnect(); await replSet?.stop(); });

const mkUser = async () => User.create({ name: 'Verifier', email: `v${Math.random().toString(36).slice(2)}@t.local`, password: 'Password@123', phone: `9${String(Math.floor(Math.random() * 1e9)).padStart(9, '0')}` });

describe('verifyData rules', () => {
  it('passes on consistent data', async () => {
    const u = await mkUser();
    await Wallet.create({ userId: u._id, balancePaise: 500 });
    await WalletTxn.create({ userId: u._id, type: 'SIGNUP_CREDIT', amountPaise: 500, idempotencyKey: `s:${u._id}` });
    const res = await verifyData();
    expect(res.ok).toBe(true);
  });

  it('flags wallet balance ≠ Σtxns and negative balance', async () => {
    const u = await mkUser();
    await Wallet.create({ userId: u._id, balancePaise: 999 });
    await WalletTxn.create({ userId: u._id, type: 'TOPUP', amountPaise: 100, idempotencyKey: `t:${u._id}` });
    const res = await verifyData();
    expect(res.ok).toBe(false);
    expect(res.violations.some((v) => v.includes('≠ Σtxns'))).toBe(true);
  });

  it('flags issue fund ≠ supports + credit and supporterCount mismatch', async () => {
    const u = await mkUser();
    const iss = await Issue.create({ title: 'Verifier issue title', description: 'A long enough description for the verifier fixture issue.', category: 'ROAD', reporterId: u._id, location: { type: 'Point', coordinates: [77, 12] }, fundPaise: 999, supporterCount: 5, status: 'ACTIVE' });
    await IssueSupport.create({ issueId: iss._id, userId: u._id, amountPaise: 500, isReporter: true });
    const res = await verifyData();
    expect(res.violations.some((v) => v.includes('fund'))).toBe(true);
    expect(res.violations.some((v) => v.includes('supporterCount'))).toBe(true);
  });

  it('flags helper rating drift', async () => {
    const u = await mkUser();
    const h = await Helper.create({ userId: u._id, displayName: 'V Helper', phone: '9876543210', categories: ['PLUMBER'], bio: 'A long enough bio for the verifier helper fixture here.', serviceLocation: { type: 'Point', coordinates: [77, 12] }, verificationStatus: 'VERIFIED', ratingAvg: 5, ratingCount: 0 });
    await Review.create({ helperId: h._id, seekerId: u._id, rating: 2 });
    const res = await verifyData();
    expect(res.violations.some((v) => v.includes('ratingAvg'))).toBe(true);
  });
});
