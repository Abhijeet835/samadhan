import mongoose from 'mongoose';

import Issue, { ISSUE_CATEGORIES } from './issue.model.js';
import IssueSupport from './issueSupport.model.js';
import IssueUpdate from './issueUpdate.model.js';
import IssueFlag from '../admin/issueFlag.model.js';
import Wallet from '../wallet/wallet.model.js';
import WalletTxn from '../wallet/walletTxn.model.js';
import { chargeWallet, getEffectiveTierThresholds, getSetting } from '../wallet/wallet.service.js';
import { checkTiers } from '../tiers/tier.service.js';
import { cancelOpenDispatchForIssue, getEscalationSummary } from '../dispatch/dispatch.service.js';
import { removeIssuePostsRemote, takedownIssuePosts } from '../social/social.service.js';
import { notifyUsers } from '../notifications/notification.service.js';
import { ApiError } from '../../utils/apiResponse.js';

/**
 * Allowed lifecycle transitions. Status and tier are separate fields; every
 * change goes through transitionIssue and writes an issueUpdates timeline row.
 */
const ALLOWED_TRANSITIONS = Object.freeze({
  ACTIVE: ['ACKNOWLEDGED', 'IN_PROGRESS', 'RESOLVED', 'REJECTED'],
  ACKNOWLEDGED: ['IN_PROGRESS', 'RESOLVED', 'REJECTED'],
  IN_PROGRESS: ['RESOLVED', 'REJECTED'],
  RESOLVED: ['CLOSED', 'ACTIVE'],
  CLOSED: [],
  REJECTED: [],
});

const ADMIN_ONLY = ['ACKNOWLEDGED', 'IN_PROGRESS', 'REJECTED', 'CLOSED'];
const SUPPORTABLE_STATUSES = ['ACTIVE', 'ACKNOWLEDGED', 'IN_PROGRESS'];

// Phase 8B: reuse the single state machine for admin UI (no duplicated rules).
export function getAllowedTransitions(status) {
  return [...(ALLOWED_TRANSITIONS[status] ?? [])];
}

// Phase 8B B8: community flags NEVER auto-hide issues (money is involved).
export async function flagIssue({ userId, issueId, reason, comment }) {
  const issue = await Issue.findById(issueId);
  if (!issue) throw new ApiError('Issue not found.', 404, 'ISSUE_NOT_FOUND');
  if (['CLOSED', 'REJECTED'].includes(issue.status)) throw new ApiError('Cannot flag a terminal issue.', 409, 'ISSUE_NOT_OPEN');
  if (String(issue.reporterId) === String(userId)) throw new ApiError('You cannot flag your own issue.', 409, 'CANNOT_FLAG_OWN_ISSUE');
  try {
    await IssueFlag.create({ issueId, userId, reason, comment });
  } catch (error) {
    if (error?.code === 11000) throw new ApiError('You have already flagged this issue.', 409, 'ALREADY_FLAGGED');
    throw error;
  }
  const flagCount = await IssueFlag.countDocuments({ issueId, dismissed: false });
  return { flagCount };
}

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

  const disabled = await getSetting('disabledIssueCategories');
  if ((disabled ?? []).includes(issueData.category)) {
    throw new ApiError('This category is currently disabled.', 400, 'CATEGORY_DISABLED');
  }

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

  // Demo/low thresholds can be met at report time. Failure-isolated.
  try {
    await checkTiers(created._id);
  } catch (error) {
    console.error('[tiers] check failed after report:', error.message);
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

  // AFTER the payment commits — never inside the transaction. The HTTP
  // response waits only for the atomic claims, not for SMTP/n8n side effects.
  let tierUnlocked = [];
  try {
    const { claimedTiers } = await checkTiers(issueId);
    tierUnlocked = claimedTiers;
  } catch (error) {
    console.error('[tiers] check failed after support:', error.message);
  }

  return { ...result, tierUnlocked };
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

const MAP_OPEN_STATUSES = ['ACTIVE', 'ACKNOWLEDGED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];

function cloudinaryThumb(url) {
  if (typeof url === 'string' && url.includes('res.cloudinary.com') && url.includes('/upload/')) {
    return url.replace('/upload/', '/upload/c_fill,w_240,h_160,q_auto,f_auto/');
  }
  return url;
}

/**
 * Phase 8A map view: a bounded, public, PII-free projection of existing issues.
 * REJECTED never returned. Optional bbox via $geoWithin Polygon (SW→SE→NE→NW→SW).
 */
export async function getIssuesMap({ west, south, east, north, category, status, minTier = 0, limit = 200 }) {
  const hasBbox = [west, south, east, north].some((v) => v !== undefined);
  if (hasBbox) {
    if ([west, south, east, north].some((v) => v === undefined)) {
      throw new ApiError('Provide all four bbox edges or none.', 400, 'BBOX_INVALID');
    }
    if (west < -180 || east > 180 || south < -90 || north > 90 || west >= east || south >= north) {
      throw new ApiError('Invalid bbox ranges.', 400, 'BBOX_INVALID');
    }
    if (east - west > 5 || north - south > 5) {
      throw new ApiError('Bounding box too large — zoom in.', 400, 'BBOX_TOO_LARGE');
    }
  }

  const statuses = status
    ? status.split(',').map((s) => s.trim()).filter((s) => MAP_OPEN_STATUSES.includes(s))
    : ['ACTIVE', 'ACKNOWLEDGED', 'IN_PROGRESS'];
  const filter = { status: { $in: statuses.length ? statuses : ['ACTIVE', 'ACKNOWLEDGED', 'IN_PROGRESS'] } };
  if (category) filter.category = category;
  if (Number(minTier) > 0) filter.tier = { $gte: Number(minTier) };
  if (hasBbox) {
    filter.location = {
      $geoWithin: {
        $geometry: {
          type: 'Polygon',
          coordinates: [[[west, south], [east, south], [east, north], [west, north], [west, south]]],
        },
      },
    };
  }

  const cappedLimit = Math.min(Number(limit) || 200, 300);
  const docs = await Issue.find(filter)
    .sort({ tier: -1, fundPaise: -1 })
    .limit(cappedLimit + 1)
    .select('_id title category status tier fundPaise supporterCount location.coordinates location.city photos')
    .lean();

  const truncated = docs.length > cappedLimit;
  const items = docs.slice(0, cappedLimit).map((d) => ({
    _id: d._id,
    title: d.title,
    category: d.category,
    status: d.status,
    tier: d.tier,
    fundPaise: d.fundPaise,
    supporterCount: d.supporterCount,
    coordinates: d.location?.coordinates,
    city: d.location?.city ?? '',
    photo: d.photos?.[0] ? cloudinaryThumb(d.photos[0]) : null,
  }));
  return { items, count: items.length, truncated };
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
      .populate('authorityId', 'nameEn')
      .lean(),
    viewer
      ? IssueSupport.findOne({ issueId, userId: viewer.userId }).lean()
      : Promise.resolve(null),
  ]);

  Issue.updateOne({ _id: issueId }, { $inc: { viewsCount: 1 } }).exec().catch(() => {});

  const reporterId = String(issue.reporterId?._id ?? issue.reporterId);
  const windowDays = await getSetting('autoCloseDays');
  const escalation = await getEscalationSummary(issueId);
  return {
    issue,
    updates,
    escalation,
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
        Date.now() - new Date(issue.resolvedAt).getTime() <= windowDays * 24 * 60 * 60 * 1000,
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
  const windowDays = await getSetting('autoCloseDays');
  const session = await mongoose.startSession();
  let result;
  let fromStatus;
  let timelineRowId;
  try {
    await session.withTransaction(async () => {
      const issue = await Issue.findById(issueId).session(session);
      if (!issue) {
        throw new ApiError('Issue not found.', 404, 'ISSUE_NOT_FOUND');
      }

      validateTransition(issue, newStatus, actor, windowDays);

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
        // Cancel any pending/failed dispatch rows; refunds are untouched.
        await cancelOpenDispatchForIssue(issueId, session);
        // Social posts come down atomically with the rejection.
        await takedownIssuePosts(issueId, session);
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

      const [timelineRow] = await IssueUpdate.create(
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
      fromStatus = issue.status;
      timelineRowId = timelineRow._id;

      result = updated;
    });
  } finally {
    await session.endSession();
  }

  // Best-effort remote deletes AFTER commit — never block refunds.
  if (result?.status === 'REJECTED') {
    void removeIssuePostsRemote(issueId).catch((error) => {
      console.warn('[issues] Post-rejection remote removal failed:', error.message);
    });
  }

  // Phase 8A: notify payers AFTER commit — failure-isolated, never blocks.
  void notifyTransition(issueId, result, newStatus, fromStatus, actor, note, timelineRowId).catch((error) => {
    console.warn('[issues] transition notification failed:', error.message);
  });

  return result;
}

async function notifyTransition(issueId, issue, newStatus, fromStatus, actor, note, timelineRowId) {
  if (!issue) return;
  const supporterIds = await IssueSupport.find({ issueId }).distinct('userId');
  const title = String(issue.title ?? '').slice(0, 120);
  if (newStatus === 'REJECTED') {
    const refunds = await WalletTxn.find({ issueId, type: 'REFUND' }).lean();
    const byUser = new Map(refunds.map((r) => [String(r.userId), r.amountPaise]));
    const payers = [...new Set([String(issue.reporterId), ...supporterIds.map(String)])];
    for (const uid of payers) {
      await notifyUsers({
        userIds: [uid],
        type: 'ISSUE_REJECTED',
        payload: { issueId: String(issueId), title, refundPaise: byUser.get(uid) ?? 0, note: String(note ?? '').slice(0, 200) },
        dedupeKey: `rejected:${issueId}:${uid}`,
      });
    }
    return;
  }
  const audience = [...new Set([String(issue.reporterId), ...supporterIds.map(String)])].filter(
    (id) => id !== String(actor.userId),
  );
  await notifyUsers({
    userIds: audience,
    type: 'ISSUE_STATUS_CHANGED',
    payload: { issueId: String(issueId), title, fromStatus, toStatus: newStatus, actorRole: actor.role },
    dedupeKey: `status:${timelineRowId}`,
  });
}

function validateTransition(issue, newStatus, actor, windowDays) {
  const windowMs = windowDays * 24 * 60 * 60 * 1000;

  // SYSTEM (cron) may ONLY auto-close RESOLVED issues after the window.
  if (actor.role === 'SYSTEM') {
    if (issue.status !== 'RESOLVED' || newStatus !== 'CLOSED') {
      throw new ApiError('SYSTEM may only auto-close resolved issues.', 403, 'FORBIDDEN');
    }
    const resolvedAt = issue.resolvedAt ? new Date(issue.resolvedAt).getTime() : null;
    if (!resolvedAt || Date.now() - resolvedAt <= windowMs) {
      throw new ApiError('Auto-close window has not elapsed yet.', 409, 'INVALID_TRANSITION');
    }
    return;
  }

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
    // Reopen: reporter only, within the settings-driven window of resolution.
    if (!isReporter) {
      throw new ApiError('Only the reporter can reopen a resolved issue.', 403, 'FORBIDDEN');
    }
    const resolvedAt = issue.resolvedAt ? new Date(issue.resolvedAt).getTime() : null;
    if (!resolvedAt || Date.now() - resolvedAt > windowMs) {
      throw new ApiError(`A resolved issue can only be reopened within ${windowDays} days.`, 409, 'REOPEN_WINDOW_EXPIRED');
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
  const [reportFeePaise, supportFeePaise, thresholds, disabled] = await Promise.all([
    getSetting('reportFeePaise'),
    getSetting('supportFeePaise'),
    getEffectiveTierThresholds(),
    getSetting('disabledIssueCategories'),
  ]);
  const disabledSet = new Set(disabled ?? []);
  return {
    categories: ISSUE_CATEGORIES.filter((c) => !disabledSet.has(c)),
    reportFeePaise,
    supportFeePaise,
    thresholds,
    maxPhotos: 3,
  };
}