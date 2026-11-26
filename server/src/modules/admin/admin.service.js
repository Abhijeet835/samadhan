import mongoose from 'mongoose';

import Issue, { ISSUE_CATEGORIES, normalizeIssueCategory } from '../issues/issue.model.js';
import IssueSupport from '../issues/issueSupport.model.js';
import IssueUpdate from '../issues/issueUpdate.model.js';
import IssueFlag from './issueFlag.model.js';
import WalletTxn from '../wallet/walletTxn.model.js';
import Wallet from '../wallet/wallet.model.js';
import Settings from '../wallet/settings.model.js';
import User from '../users/user.model.js';
import Helper from '../helpers/helper.model.js';
import Connection from '../helpers/connection.model.js';
import Review from '../helpers/review.model.js';
import Authority from '../authorities/authority.model.js';
import AuditLog from '../tiers/auditLog.model.js';
import DispatchLog from '../dispatch/dispatchLog.model.js';
import SocialPost from '../social/socialPost.model.js';
import { LOCAL_CATEGORIES, normalizeLocalCategory } from '../helpers/helper.constants.js';
import { transitionIssue, getAllowedTransitions } from '../issues/issue.service.js';
import { checkTiers } from '../tiers/tier.service.js';
import { getSetting } from '../wallet/wallet.service.js';
import { notifyUsers } from '../notifications/notification.service.js';
import { assertNoContactInfo } from '../../utils/contactGuard.util.js';
import { writeAudit, snapshot } from '../../utils/audit.util.js';
import { ApiError } from '../../utils/apiResponse.js';

const OPEN = ['ACTIVE', 'ACKNOWLEDGED', 'IN_PROGRESS'];
const TERMINAL = ['CLOSED', 'REJECTED'];
const esc = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const displayName = (name) => {
  const p = String(name ?? '').trim().split(/\s+/).filter(Boolean);
  return p.length <= 1 ? p[0] ?? 'Anonymous' : `${p[0]} ${p[p.length - 1][0].toUpperCase()}.`;
};

// ---------- Issues ----------
export async function listAdminIssues({ page = 1, limit = 20, q, status, tier, category, city, flagged, hasFailedActions, exploded, sort = 'newest' }) {
  const filter = {};
  const and = [];
  if (q) {
    const rx = new RegExp(esc(q), 'i');
    and.push({ $or: [{ title: rx }, { titleHi: rx }, { 'location.city': rx }, { 'location.cityHi': rx }, { 'location.state': rx }] });
  }
  if (status) filter.status = status;
  if (tier !== undefined && tier !== '') filter.tier = Number(tier);
  if (category) filter.category = category;
  if (city) {
    const cityRx = new RegExp(`^${esc(city)}$`, 'i');
    and.push({ $or: [{ 'location.city': cityRx }, { 'location.cityHi': cityRx }] });
  }
  if (flagged === 'true') filter._id = { $in: await IssueFlag.distinct('issueId', { dismissed: false }) };
  if (hasFailedActions === 'true') {
    const [d, s] = await Promise.all([DispatchLog.distinct('issueId', { status: 'FAILED' }), SocialPost.distinct('issueId', { status: 'FAILED' })]);
    filter._id = { $in: [...new Set([...d, ...s].map(String))] };
  }
  if (exploded === 'true') {
    and.push({ $or: [{ explosionTriggered: true }, { tier: { $gte: 1 } }] });
  }
  if (and.length) filter.$and = and;
  const sortMap = { newest: { createdAt: -1 }, fund: { fundPaise: -1 }, supporters: { supporterCount: -1 }, tier: { tier: -1, fundPaise: -1 } };
  const [rows, total] = await Promise.all([
    Issue.find(filter).sort(sortMap[sort] ?? sortMap.newest).skip((page - 1) * limit).limit(limit).populate('reporterId', 'name email').lean(),
    Issue.countDocuments(filter),
  ]);
  const ids = rows.map((r) => r._id);
  const toMap = (a) => Object.fromEntries(a.map((x) => [String(x._id), x.n]));
  const [fc, fd, fs] = await Promise.all([
    IssueFlag.aggregate([{ $match: { issueId: { $in: ids }, dismissed: false } }, { $group: { _id: '$issueId', n: { $sum: 1 } } }]).then(toMap),
    DispatchLog.aggregate([{ $match: { issueId: { $in: ids }, status: 'FAILED' } }, { $group: { _id: '$issueId', n: { $sum: 1 } } }]).then(toMap),
    SocialPost.aggregate([{ $match: { issueId: { $in: ids }, status: 'FAILED' } }, { $group: { _id: '$issueId', n: { $sum: 1 } } }]).then(toMap),
  ]);
  const items = rows.map((r) => ({
    _id: r._id, title: r.title, titleHi: r.titleHi ?? '', language: r.issueLang || r.language || 'en',
    category: r.category, issueType: r.issueType || 'SOCIAL_EXPLOSION',
    status: r.status, tier: r.tier, explosionTriggered: !!r.explosionTriggered,
    fundPaise: r.fundPaise, platformCreditPaise: r.platformCreditPaise ?? 0, supporterCount: r.supporterCount,
    flagCount: fc[String(r._id)] ?? 0, city: r.location?.city ?? '', cityHi: r.location?.cityHi ?? '', createdAt: r.createdAt,
    reporter: r.reporterId ? { _id: r.reporterId._id, name: r.reporterId.name, email: r.reporterId.email } : null,
    failedDispatch: fd[String(r._id)] ?? 0, failedSocial: fs[String(r._id)] ?? 0,
  }));
  return { items, pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) } };
}

export async function getAdminIssue(issueId) {
  const issue = await Issue.findById(issueId).populate('reporterId', 'name email').populate('authorityId').lean();
  if (!issue) throw new ApiError('Issue not found.', 404, 'ISSUE_NOT_FOUND');
  const [timeline, contributors, dispatch, social, flags, top] = await Promise.all([
    IssueUpdate.find({ issueId }).sort({ createdAt: 1 }).populate('actorId', 'name').populate('authorityId', 'nameEn').lean(),
    IssueSupport.aggregate([{ $match: { issueId: issue._id } }, { $group: { _id: null, count: { $sum: 1 }, totalPaise: { $sum: '$amountPaise' } } }]),
    DispatchLog.find({ issueId }).select('-bodyText -bodyHtml').sort({ createdAt: -1 }).lean(),
    SocialPost.find({ issueId }).select('platform tier status generationSource externalUrl shareClicks lastError').lean(),
    IssueFlag.find({ issueId }).populate('userId', 'name').lean(),
    IssueSupport.find({ issueId }).sort({ amountPaise: -1 }).limit(10).populate('userId', 'name').lean(),
  ]);
  return {
    issue, timeline,
    contributors: { count: contributors[0]?.count ?? 0, totalPaise: contributors[0]?.totalPaise ?? 0, top: top.map((s) => ({ name: displayName(s.userId?.name), amountPaise: s.amountPaise, isReporter: s.isReporter })) },
    dispatch, social, flags, authority: issue.authorityId ?? null,
    allowedTransitions: getAllowedTransitions(issue.status),
  };
}

export async function adminTransition(issueId, status, note, actor) {
  if (status === 'REJECTED' && String(note ?? '').trim().length < 10) {
    throw new ApiError('Rejection requires a note of at least 10 characters.', 400, 'VALIDATION_ERROR');
  }
  const before = await Issue.findById(issueId).lean();
  if (!before) throw new ApiError('Issue not found.', 404, 'ISSUE_NOT_FOUND');
  const result = await transitionIssue(issueId, status, { userId: actor.userId, role: 'ADMIN' }, note);
  await writeAudit({ actor, action: 'ISSUE_TRANSITION', entity: 'issue', entityId: issueId, before: snapshot('issue', before), after: snapshot('issue', result) });
  return result;
}

export async function assignAuthority(issueId, authorityId, actor) {
  const issue = await Issue.findById(issueId);
  if (!issue) throw new ApiError('Issue not found.', 404, 'ISSUE_NOT_FOUND');
  if (TERMINAL.includes(issue.status)) throw new ApiError('Cannot assign authority on a terminal issue.', 409, 'ISSUE_NOT_OPEN');
  let authority = null;
  if (authorityId) {
    authority = await Authority.findById(authorityId);
    if (!authority || !authority.isActive) throw new ApiError('Authority must exist and be active.', 400, 'VALIDATION_ERROR');
  }
  const before = snapshot('issue', issue);
  issue.authorityId = authority ? authority._id : null;
  await issue.save();
  await IssueUpdate.create({ issueId, kind: 'AUTHORITY_ASSIGNED', authorityId: authority ? authority._id : null, actorId: actor.userId, actorRole: 'ADMIN', toStatus: null, note: authority ? `Assigned ${authority.nameEn}` : 'Authority unassigned' });
  await writeAudit({ actor, action: 'ISSUE_ASSIGN_AUTHORITY', entity: 'issue', entityId: issueId, before, after: snapshot('issue', issue) });
  return issue.toObject();
}

export async function authorityReply(issueId, message, authorityId, actor) {
  const issue = await Issue.findById(issueId);
  if (!issue) throw new ApiError('Issue not found.', 404, 'ISSUE_NOT_FOUND');
  if (issue.status === 'REJECTED') throw new ApiError('Cannot record a reply on a rejected issue.', 409, 'ISSUE_NOT_OPEN');
  assertNoContactInfo({ message });
  const authId = authorityId ?? issue.authorityId;
  const [row] = await IssueUpdate.create([{ issueId, kind: 'AUTHORITY_REPLY', authorityId: authId ?? null, note: message, actorId: actor.userId, actorRole: 'ADMIN', toStatus: null }]);
  await writeAudit({ actor, action: 'ISSUE_AUTHORITY_REPLY', entity: 'issue', entityId: issueId, meta: { rowId: String(row._id) } });
  const supporterIds = await IssueSupport.find({ issueId }).distinct('userId');
  void notifyUsers({ userIds: [issue.reporterId, ...supporterIds], type: 'ISSUE_AUTHORITY_REPLY', payload: { issueId: String(issueId), title: issue.title.slice(0, 120) }, dedupeKey: `reply:${row._id}` }).catch(() => {});
  return row;
}

export async function platformCredit(issueId, amountPaise, reason, idempotencyKey, actor) {
  const max = await getSetting('platformCreditMaxPaise');
  if (!Number.isInteger(amountPaise) || amountPaise <= 0 || amountPaise > max) {
    throw new ApiError(`amountPaise must be a positive integer ≤ ${max}.`, 400, 'INVALID_AMOUNT');
  }
  const session = await mongoose.startSession();
  let result;
  try {
    await session.withTransaction(async () => {
      const existing = await IssueUpdate.findOne({ idempotencyKey }).session(session);
      if (existing) {
        if (String(existing.issueId) !== String(issueId)) throw new ApiError('Key used for another issue.', 409, 'IDEMPOTENCY_KEY_CONFLICT');
        result = { issue: await Issue.findById(issueId).session(session), idempotent: true };
        return;
      }
      const issue = await Issue.findById(issueId).session(session);
      if (!issue) throw new ApiError('Issue not found.', 404, 'ISSUE_NOT_FOUND');
      if (!OPEN.includes(issue.status)) throw new ApiError('Credits only apply to open issues.', 409, 'ISSUE_NOT_OPEN');
      const updated = await Issue.findOneAndUpdate(
        { _id: issueId, status: { $in: OPEN } },
        { $inc: { fundPaise: amountPaise, platformCreditPaise: amountPaise } },
        { returnDocument: 'after', session },
      );
      if (!updated) throw new ApiError('Issue status changed concurrently.', 409, 'ISSUE_NOT_OPEN');
      await IssueUpdate.create([{ issueId, kind: 'PLATFORM_CREDIT', amountPaise, note: `Samadhan added ₹${amountPaise / 100} platform credit: ${reason}`, actorId: actor.userId, actorRole: 'ADMIN', idempotencyKey, toStatus: null }], { session });
      await writeAudit({ actor, action: 'ISSUE_PLATFORM_CREDIT', entity: 'issue', entityId: issueId, before: snapshot('issue', issue), after: snapshot('issue', updated), session });
      result = { issue: updated, idempotent: false };
    });
  } catch (error) {
    if (error?.code === 11000) {
      const ex = await IssueUpdate.findOne({ idempotencyKey });
      if (ex) {
        if (String(ex.issueId) !== String(issueId)) throw new ApiError('Key used for another issue.', 409, 'IDEMPOTENCY_KEY_CONFLICT');
        return { issue: await Issue.findById(issueId), tierUnlocked: [], idempotent: true };
      }
    }
    throw error;
  } finally {
    await session.endSession();
  }

  let tierUnlocked = [];
  if (!result.idempotent) {
    try { tierUnlocked = (await checkTiers(issueId)).claimedTiers; } catch (e) { console.error('[admin] credit tier check failed:', e.message); }
    const supporterIds = await IssueSupport.find({ issueId }).distinct('userId');
    void notifyUsers({ userIds: [result.issue.reporterId, ...supporterIds], type: 'ISSUE_PLATFORM_CREDIT', payload: { issueId: String(issueId), title: result.issue.title.slice(0, 120), amountPaise }, dedupeKey: `credit:${issueId}:${idempotencyKey}` }).catch(() => {});
  }
  return { ...result, tierUnlocked };
}

export async function dismissIssueFlags(issueId, actor) {
  const res = await IssueFlag.updateMany({ issueId, dismissed: false }, { $set: { dismissed: true } });
  await writeAudit({ actor, action: 'ISSUE_FLAGS_DISMISS', entity: 'issue', entityId: issueId, meta: { modified: res.modifiedCount } });
  return { modifiedCount: res.modifiedCount };
}

// ---------- Users ----------
const SAFE_USER = '_id name email phone role isActive activeMode language createdAt';
export async function listAdminUsers({ page = 1, limit = 20, q, role, isActive }) {
  const filter = {};
  if (q) { const r = new RegExp(esc(q), 'i'); filter.$or = [{ name: r }, { email: r }, { phone: r }]; }
  if (role) {
    if (role === 'CONSUMER' || role === 'CITIZEN') filter.role = { $in: ['CONSUMER', 'CITIZEN'] };
    else if (role === 'PROVIDER' || role === 'HELPER') filter.role = { $in: ['PROVIDER', 'HELPER'] };
    else filter.role = role;
  }
  if (isActive !== undefined && isActive !== '') filter.isActive = isActive === 'true';
  const [rows, total] = await Promise.all([
    User.find(filter).select(SAFE_USER).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    User.countDocuments(filter),
  ]);
  const ids = rows.map((r) => r._id);
  const [helpers, wallets] = await Promise.all([Helper.find({ userId: { $in: ids } }).select('userId').lean(), Wallet.find({ userId: { $in: ids } }).lean()]);
  const helperSet = new Set(helpers.map((h) => String(h.userId)));
  const walletMap = Object.fromEntries(wallets.map((w) => [String(w.userId), w.balancePaise]));
  return {
    items: rows.map((u) => ({ ...u, hasHelperProfile: helperSet.has(String(u._id)), walletBalancePaise: walletMap[String(u._id)] ?? 0 })),
    pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
  };
}

export async function getAdminUser(userId) {
  const user = await User.findById(userId).select(SAFE_USER).lean();
  if (!user) throw new ApiError('User not found.', 404, 'USER_NOT_FOUND');
  const [wallet, txns, issuesReported, issuesSupported, connections, helper] = await Promise.all([
    Wallet.findOne({ userId }).lean(),
    WalletTxn.find({ userId }).sort({ createdAt: -1 }).limit(10).lean(),
    Issue.countDocuments({ reporterId: userId }),
    IssueSupport.countDocuments({ userId }),
    Connection.countDocuments({ seekerId: userId }),
    Helper.findOne({ userId }).select('displayName verificationStatus isHidden').lean(),
  ]);
  return { user, walletBalancePaise: wallet?.balancePaise ?? 0, txns, counts: { issuesReported, issuesSupported, connections }, helper };
}

export async function patchUserActive(userId, isActive, actor) {
  if (String(userId) === String(actor.userId)) throw new ApiError('Cannot modify your own account.', 403, 'FORBIDDEN_TARGET');
  const target = await User.findById(userId);
  if (!target) throw new ApiError('User not found.', 404, 'USER_NOT_FOUND');
  if (target.role === 'ADMIN') throw new ApiError('Cannot modify another admin.', 403, 'FORBIDDEN_TARGET');
  const before = snapshot('user', target);
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      target.isActive = isActive;
      await target.save({ session });
      if (!isActive) await Helper.updateOne({ userId }, { $set: { isHidden: true } }, { session });
      await writeAudit({ actor, action: 'USER_SET_ACTIVE', entity: 'user', entityId: userId, before, after: { isActive }, session });
    });
  } finally { await session.endSession(); }
  return { _id: target._id, isActive: target.isActive };
}

// ---------- Settings ----------
const SETTINGS_SPEC = {
  reportFeePaise: { type: 'int', min: 100, max: 10000 },
  supportFeePaise: { type: 'int', min: 100, max: 10000 },
  tier1Paise: { type: 'int', min: 100 },
  tier2Paise: { type: 'int', min: 100 },
  smallIssueThreshold: { type: 'int', min: 1, max: 1000 },
  mediumIssueThreshold: { type: 'int', min: 2, max: 5000 },
  largeIssueThreshold: { type: 'int', min: 3, max: 20000 },
  smallPoolGoalPaise: { type: 'int', min: 1000, max: 50000000 },
  mediumPoolGoalPaise: { type: 'int', min: 2000, max: 50000000 },
  largePoolGoalPaise: { type: 'int', min: 5000, max: 50000000 },
  platformCommissionPercent: { type: 'int', min: 0, max: 50 },
  signupCreditPaise: { type: 'int', min: 100, max: 100000 },
  duplicateRadiusM: { type: 'int', min: 10, max: 1000 },
  duplicateDays: { type: 'int', min: 1, max: 180 },
  autoCloseDays: { type: 'int', min: 1, max: 60 },
  platformCreditMaxPaise: { type: 'int', min: 100, max: 500000 },
  demoMode: { type: 'bool' },
};

export async function getAdminSettings() {
  const docs = await Settings.find().lean();
  const map = Object.fromEntries(docs.map((d) => [d.key, d.value]));
  return {
    settings: Object.entries(SETTINGS_SPEC).map(([key, spec]) => ({ key, value: map[key], ...spec })),
    demoThresholds: { tier1Paise: 2000, tier2Paise: 5000 },
    demoImportanceThresholds: { SMALL: 3, MEDIUM: 6, LARGE: 12 },
    socialPublishMode: map.socialPublishMode,
  };
}

export async function patchAdminSettings(patch, actor) {
  const docs = await Settings.find().lean();
  const merged = Object.fromEntries(docs.map((d) => [d.key, d.value]));
  for (const [key, value] of Object.entries(patch)) {
    const spec = SETTINGS_SPEC[key];
    if (!spec) throw new ApiError(`Unknown setting: ${key}`, 400, 'VALIDATION_ERROR');
    if (spec.type === 'int') {
      if (!Number.isInteger(value)) throw new ApiError(`${key} must be an integer`, 400, 'VALIDATION_ERROR');
      if (spec.min != null && value < spec.min) throw new ApiError(`${key} below minimum ${spec.min}`, 400, 'VALIDATION_ERROR');
      if (spec.max != null && value > spec.max) throw new ApiError(`${key} above maximum ${spec.max}`, 400, 'VALIDATION_ERROR');
    } else if (spec.type === 'bool' && typeof value !== 'boolean') {
      throw new ApiError(`${key} must be boolean`, 400, 'VALIDATION_ERROR');
    }
    merged[key] = value;
  }
  if (merged.tier2Paise <= merged.tier1Paise) throw new ApiError('tier2Paise must be greater than tier1Paise', 400, 'VALIDATION_ERROR');
  const before = {}; const after = {};
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      for (const [key, value] of Object.entries(patch)) {
        before[key] = (await Settings.findOne({ key }).session(session))?.value;
        await Settings.updateOne({ key }, { $set: { value } }, { session });
        after[key] = value;
      }
      await writeAudit({ actor, action: 'SETTINGS_PATCH', entity: 'settings', entityId: 'global', before, after, session });
    });
  } finally { await session.endSession(); }
  return { before, after };
}

// ---------- Categories ----------
export async function getCategories() {
  const [di, dh] = await Promise.all([getSetting('disabledIssueCategories'), getSetting('disabledHelperCategories')]);
  return {
    global: ISSUE_CATEGORIES.map((key) => ({ key, enabled: !(di ?? []).includes(key) })),
    local: LOCAL_CATEGORIES.map((key) => ({ key, enabled: !(dh ?? []).includes(key) })),
  };
}

export async function patchCategories({ disabledIssueCategories, disabledHelperCategories }, actor) {
  const patch = {};
  if (disabledIssueCategories) {
    const normalizedIssueCats = [...new Set(disabledIssueCategories.map(normalizeIssueCategory))];
    if (normalizedIssueCats.includes('OTHER')) throw new ApiError('Cannot disable OTHER.', 400, 'VALIDATION_ERROR');
    if (normalizedIssueCats.length >= ISSUE_CATEGORIES.length) throw new ApiError('Cannot disable all categories.', 400, 'VALIDATION_ERROR');
    patch.disabledIssueCategories = normalizedIssueCats;
  }
  if (disabledHelperCategories) {
    const normalizedLocalCats = [...new Set(disabledHelperCategories.map(normalizeLocalCategory))];
    if (normalizedLocalCats.length >= LOCAL_CATEGORIES.length) throw new ApiError('Cannot disable all categories.', 400, 'VALIDATION_ERROR');
    patch.disabledHelperCategories = normalizedLocalCats;
  }
  const before = { disabledIssueCategories: await getSetting('disabledIssueCategories'), disabledHelperCategories: await getSetting('disabledHelperCategories') };
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      for (const [key, value] of Object.entries(patch)) await Settings.updateOne({ key }, { $set: { value } }, { session });
      await writeAudit({ actor, action: 'CATEGORIES_PATCH', entity: 'category', entityId: 'global', before, after: { ...before, ...patch }, session });
    });
  } finally { await session.endSession(); }
  return getCategories();
}

// ---------- Audit viewer ----------
export async function listAudit({ page = 1, limit = 50, action, entity, entityId, actorId, from, to, q }) {
  const filter = {};
  if (action) filter.action = action;
  if (entity) filter.entity = entity;
  if (entityId) filter.entityId = entityId;
  if (actorId) filter.actorId = actorId;
  if (from || to) filter.createdAt = { ...(from ? { $gte: new Date(from) } : {}), ...(to ? { $lte: new Date(to) } : {}) };
  if (q) filter.action = new RegExp(esc(q), 'i');
  const [rows, total] = await Promise.all([
    AuditLog.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).populate('actorId', 'name role').lean(),
    AuditLog.countDocuments(filter),
  ]);
  const items = rows.map((r) => ({
    _id: r._id, createdAt: r.createdAt, action: r.action,
    actor: r.actorId ? { _id: r.actorId._id, name: r.actorId.name, role: r.actorId.role } : null,
    entity: r.entity, entityId: r.entityId,
    before: r.before ?? r.meta?.before ?? null,
    after: r.after ?? r.meta?.after ?? null,
    meta: r.meta,
  }));
  return { items, pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) } };
}

export async function auditActions() {
  return { actions: await AuditLog.distinct('action') };
}
