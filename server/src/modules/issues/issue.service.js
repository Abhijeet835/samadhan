import mongoose from 'mongoose';

import Issue, { ISSUE_CATEGORIES } from './issue.model.js';
import IssueSupport from './issueSupport.model.js';
import IssueUpdate from './issueUpdate.model.js';
import WalletTxn from '../wallet/walletTxn.model.js';
import { chargeWallet, getSetting } from '../wallet/wallet.service.js';
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

/**
 * Report a Global issue. ONE transaction: debit reportFeePaise (from settings)
 * → create issue (fundPaise = fee, supporterCount = 1) → reporter support row
 * → timeline row → REPORT_FEE ledger row with issueId.
 *
 * A replayed idempotencyKey returns the original issue without charging again.
 */
export async function createIssue({ reporterId, data }) {
  const { idempotencyKey, ...issueData } = data;

  const existingTxn = await WalletTxn.findOne({ idempotencyKey });
  if (existingTxn?.issueId) {
    const existing = await Issue.findById(existingTxn.issueId);
    if (existing) {
      return { issue: existing.toObject(), idempotent: true };
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
 * Public metadata for the report wizard: categories and the fee from settings.
 */
export async function getIssueMeta() {
  return {
    categories: [...ISSUE_CATEGORIES],
    reportFeePaise: await getSetting('reportFeePaise'),
    maxPhotos: 3,
  };
}