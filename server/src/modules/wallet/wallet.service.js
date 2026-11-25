import mongoose from 'mongoose';

import Settings from './settings.model.js';
import Wallet from './wallet.model.js';
import WalletTxn, { WALLET_TXN_TYPES } from './walletTxn.model.js';
import { TOPUP_PACKS_PAISE } from './wallet.schema.js';
import { ApiError } from '../../utils/apiResponse.js';

const CREDIT_TYPES = ['TOPUP', 'REFUND', 'PLATFORM_CREDIT', 'SIGNUP_CREDIT', 'BOOKING_PAYOUT', 'BOOKING_REFUND'];
const DEBIT_TYPES = ['REPORT_FEE', 'SUPPORT_FEE', 'POOL_CONTRIBUTION', 'BOOKING_PAYMENT'];

// All money values are integer paise. Dynamic importance limits & platform
// commission percent are stored in settings so business logic never hardcodes them.
const DEFAULT_SETTINGS = Object.freeze({
  reportFeePaise: 500,
  supportFeePaise: 100,
  tier1Paise: 20000,
  tier2Paise: 50000,
  smallIssueThreshold: 5,
  mediumIssueThreshold: 15,
  largeIssueThreshold: 30,
  smallPoolGoalPaise: 50000,
  mediumPoolGoalPaise: 250000,
  largePoolGoalPaise: 1000000,
  platformCommissionPercent: 10,
  signupCreditPaise: 5000,
  duplicateRadiusM: 100,
  duplicateDays: 30,
  autoCloseDays: 7,
  socialPublishMode: 'AUTO',
  platformCreditMaxPaise: 50000,
  disabledIssueCategories: [],
  disabledHelperCategories: [],
  demoMode: false,
});

const DEMO_TIER_PAISE = Object.freeze({ tier1Paise: 2000, tier2Paise: 5000 });
const DEMO_IMPORTANCE_THRESHOLDS = Object.freeze({ SMALL: 3, MEDIUM: 6, LARGE: 12 });

/**
 * Seed default settings idempotently. Existing values (e.g. changed by an
 * admin) are never overwritten — $setOnInsert only fills missing keys.
 */
export async function ensureDefaultSettings() {
  await Promise.all(
    Object.entries(DEFAULT_SETTINGS).map(([key, value]) =>
      Settings.updateOne({ key }, { $setOnInsert: { key, value } }, { upsert: true }),
    ),
  );
}

/**
 * Read a single setting. Business logic must never hardcode fees/thresholds.
 */
export async function getSetting(key) {
  const doc = await Settings.findOne({ key });
  if (!doc) {
    throw new ApiError(`Setting "${key}" is missing. Run ensureDefaultSettings.`, 500, 'SETTING_NOT_FOUND');
  }
  return doc.value;
}

/**
 * Tier thresholds honouring demoMode. Consumed by the Phase 5 tier engine.
 */
export async function getEffectiveTierThresholds() {
  const demoMode = await getSetting('demoMode');
  if (demoMode === true) {
    return { ...DEMO_TIER_PAISE };
  }
  return {
    tier1Paise: await getSetting('tier1Paise'),
    tier2Paise: await getSetting('tier2Paise'),
  };
}

/**
 * Dynamic importance-based supporter thresholds (SMALL / MEDIUM / LARGE).
 */
export async function getImportanceThresholds() {
  const demoMode = await getSetting('demoMode');
  if (demoMode === true) {
    return { ...DEMO_IMPORTANCE_THRESHOLDS };
  }
  return {
    SMALL: await getSetting('smallIssueThreshold').catch(() => 5),
    MEDIUM: await getSetting('mediumIssueThreshold').catch(() => 15),
    LARGE: await getSetting('largeIssueThreshold').catch(() => 30),
  };
}

export async function getPoolGoalDefaults() {
  return {
    SMALL: await getSetting('smallPoolGoalPaise').catch(() => 50000),
    MEDIUM: await getSetting('mediumPoolGoalPaise').catch(() => 250000),
    LARGE: await getSetting('largePoolGoalPaise').catch(() => 1000000),
  };
}

export async function getCommissionPercent() {
  const pct = await getSetting('platformCommissionPercent').catch(() => 10);
  return Number.isFinite(Number(pct)) ? Math.min(50, Math.max(0, Number(pct))) : 10;
}

/**
 * Atomically apply a signed paise amount to a user's wallet and write the
 * immutable ledger row inside ONE MongoDB transaction.
 *
 * - Debits use a conditional update ({ balancePaise: { $gte: debit } }) so the
 *   balance can never go below zero, even under concurrent charges.
 * - The unique idempotencyKey guarantees a retry/double-tap never double-charges.
 * - Pass `session` to join a caller-owned transaction (e.g. report/support/booking flows).
 *
 * @returns {Promise<{ txn: Object, wallet: Object, idempotent: boolean }>}
 */
export async function chargeWallet({ userId, type, amountPaise, issueId, bookingId, idempotencyKey, session: outerSession }) {
  if (!WALLET_TXN_TYPES.includes(type)) {
    throw new ApiError(`Unknown wallet transaction type "${type}".`, 400, 'INVALID_TXN_TYPE');
  }
  if (!Number.isInteger(amountPaise) || amountPaise === 0) {
    throw new ApiError('amountPaise must be a non-zero integer.', 400, 'INVALID_AMOUNT');
  }
  const isCredit = CREDIT_TYPES.includes(type);
  if (isCredit !== amountPaise > 0) {
    throw new ApiError(`Sign of amountPaise does not match transaction type "${type}".`, 400, 'INVALID_AMOUNT');
  }
  if (!idempotencyKey || typeof idempotencyKey !== 'string') {
    throw new ApiError('idempotencyKey is required.', 400, 'IDEMPOTENCY_KEY_REQUIRED');
  }

  const findIdempotentResult = async () => {
    const txn = await WalletTxn.findOne({ idempotencyKey });
    if (!txn) return null;
    const wallet = await Wallet.findOne({ userId: txn.userId });
    return { txn, wallet, idempotent: true };
  };

  // Fast path: this key was already processed.
  const already = await findIdempotentResult();
  if (already) return already;

  const runInTransaction = async (session) => {
    // Re-check inside the transaction to close the read/write race window.
    const dup = await WalletTxn.findOne({ idempotencyKey }).session(session);
    if (dup) {
      const wallet = await Wallet.findOne({ userId: dup.userId }).session(session);
      return { txn: dup, wallet, idempotent: true };
    }

    let wallet;
    if (amountPaise > 0) {
      wallet = await Wallet.findOneAndUpdate(
        { userId },
        { $inc: { balancePaise: amountPaise }, $setOnInsert: { userId } },
        { returnDocument: 'after', upsert: true, session },
      );
    } else {
      // Conditional debit: matches only when the balance covers the charge.
      wallet = await Wallet.findOneAndUpdate(
        { userId, balancePaise: { $gte: -amountPaise } },
        { $inc: { balancePaise: amountPaise } },
        { returnDocument: 'after', session },
      );
      if (!wallet) {
        throw new ApiError('Insufficient wallet balance.', 409, 'INSUFFICIENT_BALANCE');
      }
    }

    const [txn] = await WalletTxn.create(
      [{ userId, type, amountPaise, issueId, bookingId, idempotencyKey }],
      { session },
    );

    return { txn, wallet, idempotent: false };
  };

  if (outerSession) {
    return runInTransaction(outerSession);
  }

  const session = await mongoose.startSession();
  try {
    let result;
    await session.withTransaction(async () => {
      result = await runInTransaction(session);
    });
    return result;
  } catch (error) {
    // A concurrent request won the race for this idempotencyKey: the unique
    // index aborted our transaction, so return the winner's result instead.
    if (error?.code === 11000) {
      const winner = await findIdempotentResult();
      if (winner) return winner;
    }
    throw error;
  } finally {
    await session.endSession();
  }
}

/**
 * Ensure the user has a wallet. New wallets receive the signup credit from
 * settings exactly once (idempotencyKey SIGNUP_CREDIT:<userId>). Also serves
 * as the lazy fallback for legacy/seeded users created before Phase 2.
 */
export async function ensureWallet(userId) {
  const existing = await Wallet.findOne({ userId });
  if (existing) return existing;

  const signupCreditPaise = await getSetting('signupCreditPaise');
  const { wallet } = await chargeWallet({
    userId,
    type: 'SIGNUP_CREDIT',
    amountPaise: signupCreditPaise,
    idempotencyKey: `SIGNUP_CREDIT:${userId}`,
  });
  return wallet;
}

/**
 * Wallet summary for GET /api/wallet.
 */
export async function getWallet(userId) {
  const wallet = await ensureWallet(userId);
  return {
    wallet: {
      balancePaise: wallet.balancePaise,
      createdAt: wallet.createdAt,
      updatedAt: wallet.updatedAt,
    },
    topupPacksPaise: [...TOPUP_PACKS_PAISE],
  };
}

/**
 * Simulated top-up. Pack validation happens in the Zod schema; the credit
 * itself is atomic and idempotent.
 */
export async function topupWallet(userId, { amountPaise, idempotencyKey }) {
  const { txn, wallet, idempotent } = await chargeWallet({
    userId,
    type: 'TOPUP',
    amountPaise,
    idempotencyKey,
  });
  return {
    wallet: { balancePaise: wallet.balancePaise },
    txn,
    idempotent,
  };
}

/**
 * Paginated ledger history, newest first, scoped to the logged-in user.
 */
export async function listTxns(userId, { page = 1, limit = 10 } = {}) {
  const filter = { userId };
  const [txns, total] = await Promise.all([
    WalletTxn.find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    WalletTxn.countDocuments(filter),
  ]);

  return {
    txns,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  };
}