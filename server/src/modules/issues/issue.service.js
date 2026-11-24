import mongoose from 'mongoose';

import Issue, { ISSUE_CATEGORIES } from './issue.model.js';
import IssueSupport from './issueSupport.model.js';
import IssueUpdate from './issueUpdate.model.js';
import Wallet from '../wallet/wallet.model.js';
import WalletTxn from '../wallet/walletTxn.model.js';
import { chargeWallet, getEffectiveTierThresholds, getSetting } from '../wallet/wallet.service.js';
import { ApiError } from '../../utils/apiResponse.js';

/**
 * Allowed lifecycle transitions. Status and tier are separate fields; every
 * change goes through transitionIssue and writes an issueUpdates timeline row.
 */
const ALLOWED_TRANSITIONS = Object.freeze({
  ACTIVE: ['ACKNOWLEDGED', 'IN_PROGRESS', 'RESOLVED', 'REJECTED'],
  ACKNOWLEDGED: ['IN_PROGRESS', 'RESOLVED'],
  IN_PROGRESS: ['RESOLVED'],
  RESOLVED: ['CLOSED', 'ACTIVE'],
  CLOSED: [],
  REJECTED: [],
});

const ADMIN_ONLY = ['ACKNOWLEDGED', 'IN_PROGRESS', 'REJECTED', 'CLOSED'];
const REOPEN_WINDOW_DAYS = 7;
const SUPPORTABLE_STATUSES = ['ACTIVE', 'ACKNOWLEDGED', 'IN_PROGRESS'];

/**
 * Nearest open issue of the SAME category within settings.duplicateRadiusM
 * metres, reported in the last settings.duplicateDays days. $geoNear must be
 * the first aggregation stage. Known limitation: two simultaneous reports at
 * the same spot can both pass (accepted for the prototype).
 */
export async function findDuplicate({ category, coordinates }) {
  const [radiusM, days] = await Promise.all([
    getSetting('duplicateRadiusM'),
    getSetting('duplicateDays'),
  ]);
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const [hit] = await Issue.aggregate([
    {
      $geoNear: {
        near: { type: 'Point', coordinates },
        distanceField: 'distanceM',
        spherical: true,
        key: 'location',
        maxDistance: radiusM,
        query: {
          category,
          status: { $nin: ['CLOSED', 'REJECTED'] },
          createdAt: { $gte: cutoff },
        },
      },
    },
    { $limit: 1 },
  ]);

  return hit ?? null;
}

/**
 * Report a Global issue. ONE transaction: debit reportFeePaise (from settings)
 * → create issue (fundPaise = fee, supporterCount = 1) → reporter support row
 * → timeline row → REPORT_FEE ledger row with issueId.
 *
 * A replayed idempotencyKey returns the original issue without charging again.
 */
export async function createIssue({ reporterId, data }) {
  const { idempotencyKey, force, ...issueData } = data;

  const existingTxn = await WalletTxn.findOne({ idempotencyKey });
  if (existingTxn?.issueId) {
    const existing = await Issue.findById(existingTxn.issueId);
    if (existing) {
      return { issue: existing.toObject(), idempotent: true };
    }
  }

  // Duplicate check runs AFTER the idempotent replay so a retry is never
  // blocked by the issue it created itself.
  if (force !== true) {
    const duplicate = await findDuplicate({
      category: issueData.category,
      coordinates: issueData.location.coordinates,
    });
    if (duplicate) {
      const viewerSupport = await IssueSupport.findOne({
        issueId: duplicate._id,
        userId: reporterId,
      }).lean();
      const existingIssue = {
        _id: duplicate._id,
        title: duplicate.title,
        category: duplicate.category,
        status: duplicate.status,
        fundPaise: duplicate.fundPaise,
        supporterCount: duplicate.supporterCount,
        photos: duplicate.photos?.length ? [duplicate.photos[0]] : [],
        distanceM: Math.round(duplicate.distanceM),
        createdAt: duplicate.createdAt,
        hasSupported: !!viewerSupport,
        isReporter: String(duplicate.reporterId) === String(reporterId),
        canSupport: !viewerSupport && SUPPORTABLE_STATUSES.includes(duplicate.status),
      };
      throw new ApiError(
        'A similar issue was already reported nearby.',
        409,
        'DUPLICATE_FOUND',
        { existingIssue },
      );
    }
  }

  const reportFeePaise = await getSetting('reportFeePaise');

  let created;
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const [issue] = await Issue.create(
        [
          {
            ...issueData,
            location: { type: 'Point', coordinates: issueData.location.coordinates, ...pickAddress(issueData.location) },
            reporterId,
            status: 'ACTIVE',
            tier: 0,
            fundPaise: reportFeePaise,
            supporterCount: 1,
          },
        ],
        { session },
      );

      await chargeWallet({
        userId: reporterId,
        type: 'REPORT_FEE',
        amountPaise: -reportFeePaise,
        issueId: issue._id,
        idempotencyKey,
        session,
      });

      await IssueSupport.create(
        [{ issueId: issue._id, userId: reporterId, amountPaise: reportFeePaise, isReporter: true }],
        { session },
      );

      await IssueUpdate.create(
        [
          {
            issueId: issue._id,
            fromStatus: null,
            toStatus: 'ACTIVE',
            actorId: reporterId,
            actorRole: 'CITIZEN',
            note: '',
          },
        ],
        { session },
      );

      created = issue;
    });
  } catch (error) {
    if (error?.code === 11000) {
      const winner = await WalletTxn.findOne({ idempotencyKey });
      if (winner?.issueId) {
        const issue = await Issue.findById(winner.issueId);
        if (issue) return { issue: issue.toObject(), idempotent: true };
      }
    }
    throw error;
  } finally {
    await session.endSession();
  }

  return { issue: created.toObject(), idempotent: false };
}

function pickAddress(location) {
  const { address, city, state, pincode } = location;
  return { address, city, state, pincode };
}

/**
 * Paid +1 support. ONE transaction: verify supportable + not already
 * supported → debit supportFeePaise (settings) → SUPPORT_FEE ledger row →
 * IssueSupport row (stores amountPaise so rejection refunds stay exact) →
 * conditional $inc on fundPaise/supporterCount guarded by the current status.
 */
export async function supportIssue({ issueId, userId, idempotencyKey }) {
  const supportFeePaise = await getSetting('supportFeePaise');

  const replayResult = async () => {
    const txn = await WalletTxn.findOne({ idempotencyKey }).lean();
    if (!txn) return null;
    const sameRequest =
      txn.type === 'SUPPORT_FEE' &&
      String(txn.userId) === String(userId) &&
      String(txn.issueId ?? '') === String(issueId);
    if (!sameRequest) {
      throw new ApiError(
        'This idempotencyKey was already used for a different request.',
        409,
        'IDEMPOTENCY_KEY_CONFLICT',
      );
    }
    const [support, issue, wallet] = await Promise.all([
      IssueSupport.findOne({ issueId, userId }).lean(),
      Issue.findById(issueId).select('fundPaise supporterCount').lean(),
      Wallet.findOne({ userId }).lean(),
    ]);
    return {
      support,
      issue: { fundPaise: issue?.fundPaise ?? 0, supporterCount: issue?.supporterCount ?? 0 },
      wallet: { balancePaise: wallet?.balancePaise ?? 0 },
      idempotent: true,
    };
  };

  // Fast path: this key was already processed (or belongs to someone else).
  const alreadyProcessed = await replayResult();
  if (alreadyProcessed) return alreadyProcessed;

  let result;
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const issue = await Issue.findById(issueId).session(session);
      if (!issue) {
        throw new ApiError('Issue not found.', 404, 'ISSUE_NOT_FOUND');
      }
      if (!SUPPORTABLE_STATUSES.includes(issue.status)) {
        throw new ApiError(
          `Issues with status ${issue.status} cannot be supported.`,
          409,
          'ISSUE_NOT_SUPPORTABLE',
        );
      }

      const existing = await IssueSupport.findOne({ issueId, userId }).session(session);
      if (existing) {
        throw new ApiError('You have already supported this issue.', 409, 'ALREADY_SUPPORTED');
      }

      const { wallet } = await chargeWallet({
        userId,
        type: 'SUPPORT_FEE',
        amountPaise: -supportFeePaise,
        issueId,
        idempotencyKey,
        session,
      });

      const [support] = await IssueSupport.create(
        [{ issueId, userId, amountPaise: supportFeePaise, isReporter: false }],
        { session },
      );

      // Conditional on the current status so a concurrent transition cannot
      // corrupt the fund counters.
      const updated = await Issue.findOneAndUpdate(
        { _id: issueId, status: issue.status },
        { $inc: { fundPaise: supportFeePaise, supporterCount: 1 } },
        { returnDocument: 'after', session },
      );
      if (!updated) {
        throw new ApiError(
          'Issue status changed concurrently. Please refresh.',
          409,
          'ISSUE_NOT_SUPPORTABLE',
        );
      }

      result = {
        support,
        issue: { fundPaise: updated.fundPaise, supporterCount: updated.supporterCount },
        wallet: { balancePaise: wallet.balancePaise },
        idempotent: false,
      };
    });
  } catch (error) {
    if (error?.code === 11000) {
      // Lost a race: either the same key was double-tapped (return the
      // winner's result) or the (issueId, userId) support row already exists.
      const raced = await replayResult();
      if (raced) return raced;
      const support = await IssueSupport.findOne({ issueId, userId }).lean();
      if (support) {
        throw new ApiError('You have already supported this issue.', 409, 'ALREADY_SUPPORTED');
      }
    }
    if (error instanceof ApiError && error.code === 'ALREADY_SUPPORTED') {
      // A transaction retry may land here after the same-key winner committed;
      // a replay of that key must return the idempotent result, not a 409.
      const raced = await replayResult();
      if (raced) return raced;
    }
    throw error;
  } finally {
    await session.endSession();
  }

  // Phase 5: checkTiers(issueId) is called here

  return result;
}

/**
 * Public feed with filters, search and sorting. REJECTED spam never appears.
 */
export async function listIssues(query) {
  const { page = 1, limit = 12, category, status, q, sort = 'latest' } = query;

  const filter = { status: { $ne: 'REJECTED' } };
  if (category) filter.category = category;
  if (status && status !== 'REJECTED') filter.status = status;
  if (q?.trim()) {
    filter.$text = { $search: q.trim() };
  }

  const sortMap = {
    latest: { createdAt: -1 },
    fund: { fundPaise: -1, createdAt: -1 },
    supporters: { supporterCount: -1, createdAt: -1 },
  };

  const [issues, total] = await Promise.all([
    Issue.find(filter)
      .sort(sortMap[sort] ?? sortMap.latest)
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('reporterId', 'name')
      .lean(),
    Issue.countDocuments(filter),
  ]);

  return {
    issues,
    pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
  };
}

/**
 * Issue detail with timeline and viewer context. REJECTED issues are only
 * visible to their reporter and admins.
 */
export async function getIssueDetail(issueId, viewer) {
  const issue = await Issue.findById(issueId).populate('reporterId', 'name role').lean();
  if (!issue) {
    throw new ApiError('Issue not found.', 404, 'ISSUE_NOT_FOUND');
  }

  const isAdmin = viewer?.role === 'ADMIN';
  if (issue.status === 'REJECTED' && !isAdmin && String(issue.reporterId?._id ?? issue.reporterId) !== String(viewer?.userId)) {
    throw new ApiError('Issue not found.', 404, 'ISSUE_NOT_FOUND');
  }

  const [updates, viewerSupport] = await Promise.all([
    IssueUpdate.find({ issueId })
      .sort({ createdAt: 1 })
      .populate('actorId', 'name')
      .lean(),
    viewer
      ? IssueSupport.findOne({ issueId, userId: viewer.userId }).lean()
      : Promise.resolve(null),
  ]);

  Issue.updateOne({ _id: issueId }, { $inc: { viewsCount: 1 } }).exec().catch(() => {});

  const reporterId = String(issue.reporterId?._id ?? issue.reporterId);
  return {
    issue,
    updates,
    viewer: {
      isAuthenticated: !!viewer,
      isReporter: viewer ? reporterId === String(viewer.userId) : false,
      isAdmin,
      hasSupported: !!viewerSupport,
      canSupport: !!viewer && SUPPORTABLE_STATUSES.includes(issue.status) && !viewerSupport,
      canReopen:
        issue.status === 'RESOLVED' &&
        reporterId === String(viewer?.userId) &&
        issue.resolvedAt &&
        Date.now() - new Date(issue.resolvedAt).getTime() <= REOPEN_WINDOW_DAYS * 24 * 60 * 60 * 1000,
    },
  };
}

/**
 * The ONLY way issue status may change. Validates the lifecycle table and the
 * actor's permissions, updates atomically against the expected current status
 * and appends a timeline row — inside one transaction.
 *
 * @param {string} issueId
 * @param {string} newStatus
 * @param {{ userId: string, role: string }} actor
 * @param {string} note
 */
export async function transitionIssue(issueId, newStatus, actor, note = '') {
  const session = await mongoose.startSession();
  let result;
  try {
    await session.withTransaction(async () => {
      const issue = await Issue.findById(issueId).session(session);
      if (!issue) {
        throw new ApiError('Issue not found.', 404, 'ISSUE_NOT_FOUND');
      }

      validateTransition(issue, newStatus, actor);

      const set = { status: newStatus };
      if (newStatus === 'RESOLVED') set.resolvedAt = new Date();
      if (newStatus === 'REJECTED') {
        // Spam rejection refunds every contribution atomically and zeroes the fund.
        const supports = await IssueSupport.find({ issueId }).session(session);
        for (const support of supports) {
          await chargeWallet({
            userId: support.userId,
            type: 'REFUND',
            amountPaise: support.amountPaise,
            issueId,
            idempotencyKey: `REFUND:${support._id}`,
            session,
          });
        }
        set.rejectedReason = note || '';
        set.fundPaise = 0;
      }

      // Conditional on the current status so concurrent transitions cannot
      // both win.
      const updated = await Issue.findOneAndUpdate(
        { _id: issueId, status: issue.status },
        { $set: set },
        { returnDocument: 'after', session },
      );
      if (!updated) {
        throw new ApiError('Issue status changed concurrently. Please refresh.', 409, 'INVALID_TRANSITION');
      }

      await IssueUpdate.create(
        [
          {
            issueId,
            fromStatus: issue.status,
            toStatus: newStatus,
            actorId: actor.userId,
            actorRole: actor.role,
            note,
          },
        ],
        { session },
      );

      result = updated;
    });
  } finally {
    await session.endSession();
  }
  return result;
}

function validateTransition(issue, newStatus, actor) {
  const allowed = ALLOWED_TRANSITIONS[issue.status] ?? [];
  if (!allowed.includes(newStatus)) {
    throw new ApiError(
      `Transition ${issue.status} → ${newStatus} is not allowed.`,
      409,
      'INVALID_TRANSITION',
    );
  }

  const isAdmin = actor.role === 'ADMIN';
  const isReporter = String(issue.reporterId) === String(actor.userId);

  if (newStatus === 'ACTIVE') {
    // Reopen: reporter only, within 7 days of resolution.
    if (!isReporter) {
      throw new ApiError('Only the reporter can reopen a resolved issue.', 403, 'FORBIDDEN');
    }
    const resolvedAt = issue.resolvedAt ? new Date(issue.resolvedAt).getTime() : null;
    if (!resolvedAt || Date.now() - resolvedAt > REOPEN_WINDOW_DAYS * 24 * 60 * 60 * 1000) {
      throw new ApiError('A resolved issue can only be reopened within 7 days.', 409, 'REOPEN_WINDOW_EXPIRED');
    }
    return;
  }

  if (ADMIN_ONLY.includes(newStatus) && !isAdmin) {
    throw new ApiError(`Only admins can set status ${newStatus}.`, 403, 'FORBIDDEN');
  }

  if (newStatus === 'RESOLVED' && !isAdmin && !isReporter) {
    throw new ApiError('Only the reporter or an admin can mark this issue resolved.', 403, 'FORBIDDEN');
  }
}

/**
 * Privacy-safe supporter list: "FirstName L." only — never email or phone.
 * REJECTED issues follow the same visibility rule as the detail endpoint.
 */
export async function listSupporters(issueId, viewer, { page = 1, limit = 20 } = {}) {
  const issue = await Issue.findById(issueId).select('status reporterId').lean();
  if (!issue) {
    throw new ApiError('Issue not found.', 404, 'ISSUE_NOT_FOUND');
  }
  const isAdmin = viewer?.role === 'ADMIN';
  const isReporter = String(issue.reporterId) === String(viewer?.userId);
  if (issue.status === 'REJECTED' && !isAdmin && !isReporter) {
    throw new ApiError('Issue not found.', 404, 'ISSUE_NOT_FOUND');
  }

  const filter = { issueId };
  const [supports, total] = await Promise.all([
    IssueSupport.find(filter)
      .sort({ createdAt: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('userId', 'name')
      .lean(),
    IssueSupport.countDocuments(filter),
  ]);

  return {
    supporters: supports.map((support) => ({
      displayName: toDisplayName(support.userId?.name),
      supportedAt: support.createdAt,
      isReporter: support.isReporter,
    })),
    pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
  };
}

function toDisplayName(name) {
  const parts = String(name ?? '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'Anonymous';
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1][0].toUpperCase()}.`;
}

/**
 * Issues I reported, newest first. Includes REJECTED — the reporter may see
 * their own rejected issues (same rule as the detail endpoint).
 */
export async function listMyIssues(userId, { page = 1, limit = 20 } = {}) {
  const filter = { reporterId: userId };
  const [issues, total] = await Promise.all([
    Issue.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .select('title category status fundPaise supporterCount photos createdAt')
      .lean(),
    Issue.countDocuments(filter),
  ]);

  return {
    issues,
    pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
  };
}

/**
 * Issues I supported (including my own reports), newest first, strictly
 * scoped to the logged-in user.
 */
export async function listMySupported(userId, { page = 1, limit = 20 } = {}) {
  const filter = { userId };
  const [supports, total] = await Promise.all([
    IssueSupport.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate({
        path: 'issueId',
        select: 'title category status fundPaise supporterCount photos createdAt',
      })
      .lean(),
    IssueSupport.countDocuments(filter),
  ]);

  return {
    supported: supports
      .filter((support) => support.issueId)
      .map((support) => ({
        issue: support.issueId,
        amountPaise: support.amountPaise,
        supportedAt: support.createdAt,
        isReporter: support.isReporter,
      })),
    pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
  };
}

/**
 * Public metadata for the report wizard: categories, fees and thresholds —
 * all from settings (demoMode-aware).
 */
export async function getIssueMeta() {
  const [reportFeePaise, supportFeePaise, thresholds] = await Promise.all([
    getSetting('reportFeePaise'),
    getSetting('supportFeePaise'),
    getEffectiveTierThresholds(),
  ]);
  return {
    categories: [...ISSUE_CATEGORIES],
    reportFeePaise,
    supportFeePaise,
    thresholds,
    maxPhotos: 3,
  };
}