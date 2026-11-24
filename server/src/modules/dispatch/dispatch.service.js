import nodemailer from 'nodemailer';

import DispatchLog, { DISPATCH_STATUSES } from './dispatchLog.model.js';
import Issue from '../issues/issue.model.js';
import Authority from '../authorities/authority.model.js';
import { renderEscalationEmail } from './dispatch.templates.js';
import { env } from '../../config/env.js';
import { ApiError } from '../../utils/apiResponse.js';

const OPEN_STATUSES = ['ACTIVE', 'ACKNOWLEDGED', 'IN_PROGRESS'];
const MAX_ATTEMPTS = 5;

// ONE transport factory so tests can swap it — no real network in tests.
let transportFactory = () =>
  nodemailer.createTransport({
    host: env.smtpHost,
    port: env.smtpPort,
    secure: env.smtpSecure,
    auth: env.smtpUser ? { user: env.smtpUser, pass: env.smtpPass } : undefined,
    connectionTimeout: 10_000,
    socketTimeout: 15_000,
  });
let cachedTransport = null;

export function setTransportFactory(factory) {
  transportFactory = factory;
  cachedTransport = null;
}

function getTransport() {
  if (!cachedTransport) cachedTransport = transportFactory();
  return cachedTransport;
}

const truncate = (value) => String(value ?? '').slice(0, 500);

/** INSERT at claim time; the unique (issueId, tier, channel) index dedupes. */
export async function ensureDispatchRow({ issueId, tier, channel, authorityId = null }) {
  try {
    const [row] = await DispatchLog.create([{ issueId, tier, channel, authorityId, status: 'PENDING' }]);
    return row;
  } catch (error) {
    if (error?.code === 11000) {
      return DispatchLog.findOne({ issueId, tier, channel });
    }
    throw error;
  }
}

/**
 * Runner rule: before executing, the issue must still be open; otherwise the
 * row is CANCELLED (ISSUE_NOT_OPEN) and nothing is sent.
 */
export async function runDispatchRow(logId) {
  const log = await DispatchLog.findById(logId);
  if (!log || log.status !== 'PENDING') return log;

  const issue = await Issue.findById(log.issueId).lean();
  if (!issue || !OPEN_STATUSES.includes(issue.status)) {
    return DispatchLog.findByIdAndUpdate(
      logId,
      { $set: { status: 'CANCELLED', reason: 'ISSUE_NOT_OPEN' } },
      { returnDocument: 'after' },
    );
  }

  return log.channel === 'EMAIL' ? executeEmail(log, issue) : executeN8n(log, issue);
}

async function executeEmail(log, issue) {
  const authority = log.authorityId ? await Authority.findById(log.authorityId).lean() : null;
  const { subject, bodyText, bodyHtml } = renderEscalationEmail({
    issue,
    authority,
    clientUrl: env.clientUrl,
  });
  const preview = { subject, bodyText, bodyHtml, authorityId: authority?._id ?? null };

  if (!authority) {
    return DispatchLog.findByIdAndUpdate(
      log._id,
      { $set: { ...preview, status: 'SKIPPED', reason: 'NO_AUTHORITY' } },
      { returnDocument: 'after' },
    );
  }

  if (!env.smtpHost) {
    // Simulated dispatch: store the full rendered email; counts as success.
    return DispatchLog.findByIdAndUpdate(
      log._id,
      { $set: { ...preview, to: authority.email, status: 'SIMULATED', sentAt: new Date() } },
      { returnDocument: 'after' },
    );
  }

  const intended = authority.email;
  const to = env.dispatchOverrideTo || intended;
  const finalSubject = env.dispatchOverrideTo ? `[TEST → ${intended}] ${subject}` : subject;

  try {
    const info = await getTransport().sendMail({
      from: env.smtpFrom,
      to,
      subject: finalSubject,
      text: bodyText,
      html: bodyHtml,
    });
    return DispatchLog.findByIdAndUpdate(
      log._id,
      {
        $set: {
          ...preview,
          to: intended,
          subject: finalSubject,
          status: 'SENT',
          messageId: info?.messageId ?? '',
          sentAt: new Date(),
          lastError: '',
        },
      },
      { returnDocument: 'after' },
    );
  } catch (error) {
    return DispatchLog.findByIdAndUpdate(
      log._id,
      { $set: { ...preview, to: intended, subject: finalSubject, status: 'FAILED', lastError: truncate(error.message) } },
      { returnDocument: 'after' },
    );
  }
}

async function executeN8n(log, issue) {
  if (!env.n8nWebhookUrl) {
    return DispatchLog.findByIdAndUpdate(
      log._id,
      { $set: { status: 'SKIPPED', reason: 'N8N_NOT_CONFIGURED' } },
      { returnDocument: 'after' },
    );
  }

  const authority = log.authorityId ? await Authority.findById(log.authorityId).lean() : null;
  // Never secrets or personal data — public issue facts only.
  const payload = {
    event: 'TIER_REACHED',
    tier: log.tier,
    issue: {
      id: String(issue._id),
      title: issue.title,
      category: issue.category,
      city: issue.location?.city ?? '',
      status: issue.status,
      supporterCount: issue.supporterCount,
      url: `${env.clientUrl}/issues/${issue._id}`,
    },
    authority: authority ? { name: authority.nameEn, handles: authority.handles } : null,
  };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5_000);
  try {
    const response = await fetch(env.n8nWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(env.n8nWebhookSecret ? { 'X-Samadhan-Secret': env.n8nWebhookSecret } : {}),
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    if (!response.ok) {
      return DispatchLog.findByIdAndUpdate(
        log._id,
        { $set: { status: 'FAILED', lastError: truncate(`Webhook responded HTTP ${response.status}`) } },
        { returnDocument: 'after' },
      );
    }
    return DispatchLog.findByIdAndUpdate(
      log._id,
      { $set: { status: 'SENT', sentAt: new Date(), lastError: '' } },
      { returnDocument: 'after' },
    );
  } catch (error) {
    return DispatchLog.findByIdAndUpdate(
      log._id,
      { $set: { status: 'FAILED', lastError: truncate(error.message) } },
      { returnDocument: 'after' },
    );
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Admin retry: only FAILED rows with attempts < 5. The conditional update
 * guarantees two concurrent retries produce exactly one execution.
 */
export async function retryDispatch(logId) {
  const existing = await DispatchLog.findById(logId);
  if (!existing) {
    throw new ApiError('Dispatch row not found.', 404, 'DISPATCH_NOT_FOUND');
  }
  const winner = await DispatchLog.findOneAndUpdate(
    { _id: logId, status: { $in: ['FAILED'] }, attempts: { $lt: MAX_ATTEMPTS } },
    { $set: { status: 'PENDING' }, $inc: { attempts: 1 } },
    { returnDocument: 'after' },
  );
  if (!winner) {
    throw new ApiError('This dispatch row cannot be retried.', 409, 'DISPATCH_NOT_RETRYABLE');
  }
  return runDispatchRow(logId);
}

export async function listDispatch({ page = 1, limit = 20, status, issueId } = {}) {
  const filter = {};
  if (status) filter.status = status;
  if (issueId) filter.issueId = issueId;
  const [rows, total] = await Promise.all([
    DispatchLog.find(filter)
      .sort({ updatedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('issueId', 'title')
      .lean(),
    DispatchLog.countDocuments(filter),
  ]);
  return {
    rows,
    pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
  };
}

/** Called inside the rejection transaction — refunds are untouched. */
export async function cancelOpenDispatchForIssue(issueId, session) {
  await DispatchLog.updateMany(
    { issueId, status: { $in: ['PENDING', 'FAILED'] } },
    { $set: { status: 'CANCELLED', reason: 'ISSUE_REJECTED' } },
    { session },
  );
}

/** Public-safe tier-2 summary: NEVER email address, subject or body. */
export async function getEscalationSummary(issueId) {
  const row = await DispatchLog.findOne({ issueId, tier: 2, channel: 'EMAIL' })
    .populate('authorityId', 'nameEn')
    .lean();
  if (!row) return null;
  return {
    status: row.status,
    authorityName: row.authorityId?.nameEn ?? null,
    sentAt: row.sentAt,
  };
}

export { DISPATCH_STATUSES };
