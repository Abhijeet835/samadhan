// Local Mode business rules. FREE directory — no wallet fees.
// Safety: only VERIFIED non-hidden helpers in search; phone revealed ONLY
// after Connect (rolling 24 h, max 10); seeker PII never exposed to helpers.

import Helper from './helper.model.js';
import Connection from './connection.model.js';
import Review from './review.model.js';
import HelperFlag from './helperFlag.model.js';
import Booking from '../bookings/booking.model.js';
import { buildProviderTextFilter } from '../bookings/booking.service.js';
import User from '../users/user.model.js';
import AuditLog from '../tiers/auditLog.model.js';
import { notifyUsers } from '../notifications/notification.service.js';
import { getCommissionPercent, getSetting } from '../wallet/wallet.service.js';
import { ApiError } from '../../utils/apiResponse.js';
import {
  AUTO_HIDE_FLAG_THRESHOLD,
  CONNECT_WINDOW_MS,
  DAILY_CONNECT_LIMIT,
  LOCAL_CATEGORIES,
  REVERIFY_FIELDS,
  SEARCH_RADII_KM,
} from './helper.constants.js';

// Override #7 / Phase 8B B6: contact guard lives in a shared util now.
import { assertNoContactInfo } from '../../utils/contactGuard.util.js';
export { assertNoContactInfo };

function toDisplayName(name) {
  const parts = String(name ?? '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'Anonymous';
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1][0].toUpperCase()}.`;
}

const OWNER_FIELDS = ['displayName', 'photoUrl', 'phone', 'categories', 'experienceYears', 'bio', 'priceHint', 'basePricePaise', 'serviceLocation', 'radiusKm', 'isAvailable'];

function pickOwnerFields(data) {
  const patch = {};
  for (const field of OWNER_FIELDS) {
    if (data[field] !== undefined) patch[field] = data[field];
  }
  if (patch.serviceLocation) {
    patch.serviceLocation = { type: 'Point', ...patch.serviceLocation };
  }
  return patch;
}

export async function getHelperMeta() {
  const [disabled, commissionPercent] = await Promise.all([
    getSetting('disabledHelperCategories'),
    getCommissionPercent(),
  ]);
  const disabledSet = new Set(disabled ?? []);
  return {
    categories: LOCAL_CATEGORIES.filter((c) => !disabledSet.has(c)),
    radii: [...SEARCH_RADII_KM],
    dailyConnectLimit: DAILY_CONNECT_LIMIT,
    commissionPercent,
  };
}

async function assertCategoriesEnabled(categories) {
  if (!categories?.length) return;
  const disabled = await getSetting('disabledHelperCategories');
  if (categories.some((c) => (disabled ?? []).includes(c))) {
    throw new ApiError('One of the chosen categories is currently disabled.', 400, 'CATEGORY_DISABLED');
  }
}

export async function registerHelper(userId, data) {
  const user = await User.findById(userId).select('role').lean();
  if (user?.role === 'ADMIN') {
    throw new ApiError('Admin accounts cannot register helper profiles.', 403, 'FORBIDDEN');
  }
  if (await Helper.findOne({ userId })) {
    throw new ApiError('You already have a helper profile.', 409, 'HELPER_PROFILE_EXISTS');
  }
  assertNoContactInfo({ displayName: data.displayName, bio: data.bio, priceHint: data.priceHint });
  await assertCategoriesEnabled(data.categories);

  const patch = pickOwnerFields(data);
  let helper;
  try {
    helper = await Helper.create({
      ...patch,
      userId,
      verificationStatus: 'PENDING',
      isHidden: false,
    });
  } catch (error) {
    // 7.1: parallel registrations — the unique userId index is the source of truth.
    if (error?.code === 11000) {
      throw new ApiError('You already have a helper profile.', 409, 'HELPER_PROFILE_EXISTS');
    }
    throw error;
  }
  return helper.toObject();
}

// 7.1: normalised comparison — rounded coordinates, undefined ≡ '', sorted
// categories — so re-sending unchanged values never resets verification.
function normCompareValue(field, value) {
  if (value === undefined || value === null) return '';
  if (field === 'categories') return [...value].sort().join(',');
  if (field === 'serviceLocation') {
    const v = typeof value?.toObject === 'function' ? value.toObject() : value;
    return JSON.stringify({
      coordinates: (v.coordinates ?? []).map((n) => Number(Number(n).toFixed(5))),
      address: v.address ?? '',
      city: v.city ?? '',
      state: v.state ?? '',
      pincode: v.pincode ?? '',
    });
  }
  return String(value);
}

export async function updateMyHelper(userId, data) {
  const helper = await Helper.findOne({ userId });
  if (!helper) throw new ApiError('Helper profile not found.', 404, 'HELPER_PROFILE_NOT_FOUND');

  assertNoContactInfo({ displayName: data.displayName, bio: data.bio, priceHint: data.priceHint });
  await assertCategoriesEnabled(data.categories);
  const patch = pickOwnerFields(data);

  const plain = helper.toObject();
  const changed = (field) =>
    patch[field] !== undefined && normCompareValue(field, patch[field]) !== normCompareValue(field, plain[field]);

  // Override #4: identity/location changes on a VERIFIED helper → re-verify.
  if (helper.verificationStatus === 'VERIFIED') {
    if (REVERIFY_FIELDS.some(changed)) patch.verificationStatus = 'PENDING';
  } else if (helper.verificationStatus === 'REJECTED') {
    // 7.1: fixing identity fields or bio is a resubmission → back to PENDING.
    if (REVERIFY_FIELDS.some(changed) || changed('bio')) {
      patch.verificationStatus = 'PENDING';
      patch.rejectionReason = '';
    }
  }

  const updated = await Helper.findByIdAndUpdate(helper._id, { $set: patch }, { returnDocument: 'after' });
  if (patch.verificationStatus === 'PENDING' && helper.verificationStatus !== 'PENDING') {
    void notifyUsers({ userIds: [userId], type: 'HELPER_REVERIFICATION_REQUIRED', payload: { helperId: String(helper._id) } }).catch(() => {});
  }
  return updated.toObject();
}

export async function getHelperDashboard(userId, { page = 1, limit = 10 } = {}) {
  const helper = await Helper.findOne({ userId });
  if (!helper) throw new ApiError('Helper profile not found.', 404, 'HELPER_PROFILE_NOT_FOUND');

  const [connections, totalConnections, reviews] = await Promise.all([
    Connection.find({ helperId: helper._id })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('seekerId', 'name')
      .lean(),
    Connection.countDocuments({ helperId: helper._id }),
    Review.find({ helperId: helper._id }).sort({ createdAt: -1 }).limit(10).populate('seekerId', 'name').lean(),
  ]);

  return {
    helper: helper.toObject(), // owner view — includes phone
    stats: {
      connectCount: helper.connectCount,
      ratingAvg: helper.ratingAvg,
      ratingCount: helper.ratingCount,
      flagCount: helper.flagCount,
    },
    connections: {
      items: connections.map((c) => ({
        _id: String(c._id),
        seekerName: toDisplayName(c.seekerId?.name),
        connectedAt: c.createdAt,
      })),
      pagination: { page, limit, total: totalConnections, totalPages: Math.max(1, Math.ceil(totalConnections / limit)) },
    },
    reviews: reviews.map((r) => ({
      reviewerName: toDisplayName(r.seekerId?.name),
      rating: r.rating,
      comment: r.comment,
      createdAt: r.createdAt,
    })),
  };
}

/**
 * Provider search: supports BOTH nearby geo search (lat/lng provided, with
 * dual radius check) AND nationwide directory browsing (state/city/category/q
 * without GPS), so seeded providers are always visible. NEVER leaks phone.
 */
export async function searchHelpers({ category, lat, lng, state, city, q, radiusKm = 5, sort, page = 1, limit = 12 }) {
  const hasGeo = Number.isFinite(lat) && Number.isFinite(lng);
  const textMatch = buildProviderTextFilter({ state, city, q });
  const baseQuery = {
    verificationStatus: 'VERIFIED',
    isHidden: false,
    ...(category ? { categories: category } : {}),
    ...textMatch,
  };

  const sortOrder = sort || (hasGeo ? 'nearest' : 'rating');
  const sortStage = {
    nearest: hasGeo ? { distanceM: 1, ratingAvg: -1 } : { ratingAvg: -1, bookingCount: -1 },
    rating: { ratingAvg: -1, ratingCount: -1, ...(hasGeo ? { distanceM: 1 } : { bookingCount: -1 }) },
    price_asc: { basePricePaise: 1, ratingAvg: -1 },
    price_desc: { basePricePaise: -1, ratingAvg: -1 },
    bookings: { bookingCount: -1, ratingAvg: -1 },
  }[sortOrder] ?? { ratingAvg: -1 };

  const pipeline = hasGeo
    ? [
        {
          $geoNear: {
            near: { type: 'Point', coordinates: [lng, lat] },
            distanceField: 'distanceM',
            spherical: true,
            key: 'serviceLocation',
            maxDistance: radiusKm * 1000,
            query: baseQuery,
          },
        },
        { $match: { $expr: { $lte: ['$distanceM', { $multiply: ['$radiusKm', 1000] }] } } },
      ]
    : [{ $match: baseQuery }];

  pipeline.push(
    { $sort: sortStage },
    {
      $facet: {
        items: [
          { $skip: (page - 1) * limit },
          { $limit: limit },
          { $project: { phone: 0, userId: 0, rejectionReason: 0, flagCount: 0, __v: 0 } },
          ...(hasGeo ? [{ $addFields: { distanceM: { $round: ['$distanceM', 0] } } }] : []),
        ],
        total: [{ $count: 'n' }],
      },
    },
  );

  const [result] = await Helper.aggregate(pipeline);
  const total = result.total[0]?.n ?? 0;
  return {
    items: result.items.map((item) => ({ ...item, serviceLocation: publicServiceLocation(item.serviceLocation) })),
    pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
  };
}

// Phase 8A privacy: public responses show an approximate area (≈110 m) and no
// street address. Owner dashboard/PATCH and admin responses keep exact data.
function publicServiceLocation(loc) {
  if (!loc) return loc;
  const { address, ...rest } = loc;
  return { ...rest, coordinates: (loc.coordinates ?? []).map((n) => Number(Number(n).toFixed(3))) };
}

export async function getHelperById(helperId, viewerUserId, { page = 1, limit = 10 } = {}) {
  const helper = await Helper.findById(helperId).lean();
  if (!helper) throw new ApiError('Helper not found.', 404, 'HELPER_NOT_FOUND');

  const viewer = viewerUserId ? await User.findById(viewerUserId).select('role').lean() : null;
  const isOwner = viewerUserId && String(helper.userId) === String(viewerUserId);
  const isAdmin = viewer?.role === 'ADMIN';
  if ((helper.verificationStatus !== 'VERIFIED' || helper.isHidden) && !isOwner && !isAdmin) {
    throw new ApiError('Helper not found.', 404, 'HELPER_NOT_FOUND');
  }

  // phone NEVER appears here — even for the owner (dashboard/PATCH only).
  const { phone, userId, rejectionReason, flagCount, ...publicProfile } = helper;
  if (!isOwner && !isAdmin) {
    publicProfile.serviceLocation = publicServiceLocation(helper.serviceLocation);
  }

  const [breakdownAgg, reviews, totalReviews] = await Promise.all([
    Review.aggregate([
      { $match: { helperId: helper._id } },
      { $group: { _id: '$rating', n: { $sum: 1 } } },
    ]),
    Review.find({ helperId })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('seekerId', 'name')
      .lean(),
    Review.countDocuments({ helperId }),
  ]);

  const ratingBreakdown = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const row of breakdownAgg) ratingBreakdown[row._id] = row.n;

  const viewerState = {
    isAuthenticated: !!viewerUserId,
    isOwner: !!isOwner,
    hasConnected: false,
    hasBooked: false,
    hasFlagged: false,
    myReview: null,
  };
  if (viewerUserId) {
    const [connected, booked, flagged, myReview] = await Promise.all([
      Connection.exists({ seekerId: viewerUserId, helperId }),
      Booking.exists({ consumerId: viewerUserId, helperId }),
      HelperFlag.exists({ userId: viewerUserId, helperId }),
      Review.findOne({ helperId, seekerId: viewerUserId }).lean(),
    ]);
    viewerState.hasConnected = !!connected;
    viewerState.hasBooked = !!booked;
    viewerState.hasFlagged = !!flagged;
    viewerState.myReview = myReview;
  }

  return {
    helper: publicProfile,
    ratingBreakdown,
    reviews: {
      items: reviews.map((r) => ({
        _id: r._id,
        reviewerName: toDisplayName(r.seekerId?.name),
        rating: r.rating,
        comment: r.comment,
        createdAt: r.createdAt,
      })),
      pagination: { page, limit, total: totalReviews, totalPages: Math.max(1, Math.ceil(totalReviews / limit)) },
    },
    viewer: viewerState,
  };
}

function connectResponse(helper, windowCount) {
  return {
    phone: helper.phone,
    whatsappUrl: helper.isSample
      ? null
      : `https://wa.me/91${helper.phone}?text=${encodeURIComponent('Hi, I found your service on Samadhan and would like to enquire.')}`,
    safetyNoteKey: 'local.safetyNote',
    remainingToday: Math.max(0, DAILY_CONNECT_LIMIT - windowCount),
    isSample: helper.isSample,
  };
}

// Per-seeker serialization so insert-then-count is race-safe: 15 parallel
// connects yield exactly 10 successes (single-process prototype scale).
// 7.1: the Map entry is removed once its tail settles and nothing newer replaced it.
const connectLocks = new Map();
function withSeekerLock(seekerId, fn) {
  const prev = connectLocks.get(seekerId) ?? Promise.resolve();
  const next = prev.then(fn, fn);
  const tail = next.catch(() => {});
  connectLocks.set(seekerId, tail);
  tail.finally(() => {
    if (connectLocks.get(seekerId) === tail) connectLocks.delete(seekerId);
  });
  return next;
}

/**
 * Connect-before-contact. Override #3:
 * (a) a connection within 24 h re-reveals the phone with NO new row/quota/count;
 * (b) connectCount counts DISTINCT seekers (first-ever pair only);
 * (c) insert first, then count the rolling window; over limit → delete + 429.
 */
export async function connectHelper({ seekerId, helperId }) {
  const helper = await Helper.findById(helperId);
  if (!helper || helper.verificationStatus !== 'VERIFIED' || helper.isHidden) {
    throw new ApiError('Helper not found.', 404, 'HELPER_NOT_FOUND');
  }
  if (String(helper.userId) === String(seekerId)) {
    throw new ApiError('You cannot connect to your own helper profile.', 409, 'CANNOT_CONNECT_SELF');
  }

  const windowStart = new Date(Date.now() - CONNECT_WINDOW_MS);
  return withSeekerLock(seekerId, async () => {
    const recent = await Connection.findOne({ seekerId, helperId, createdAt: { $gte: windowStart } }).sort({ createdAt: -1 });
    if (recent) {
      const count = await Connection.countDocuments({ seekerId, createdAt: { $gte: windowStart } });
      return connectResponse(helper, count);
    }

    const firstEver = !(await Connection.exists({ seekerId, helperId }));
    const [connection] = await Connection.create([{ seekerId, helperId }]);
    const count = await Connection.countDocuments({ seekerId, createdAt: { $gte: windowStart } });
    if (count > DAILY_CONNECT_LIMIT) {
      await Connection.deleteOne({ _id: connection._id });
      throw new ApiError('Daily connect limit reached (10 per 24 hours).', 429, 'CONNECT_LIMIT_EXCEEDED');
    }
    if (firstEver) {
      await Helper.updateOne({ _id: helperId }, { $inc: { connectCount: 1 } });
      // Provider inbox: WHO contacted me. Masked seeker name only (never PII),
      // fire-and-forget after the connection is committed.
      const seeker = await User.findById(seekerId).select('name').lean();
      void notifyUsers({
        userIds: [helper.userId],
        type: 'HELPER_NEW_CONNECT',
        payload: { helperId: String(helperId), seekerName: toDisplayName(seeker?.name) },
        dedupeKey: `connect:${connection._id}`,
      }).catch(() => {});
    }
    return connectResponse(helper, count);
  });
}

export async function upsertReview({ seekerId, helperId, rating, comment }) {
  const helper = await Helper.findById(helperId);
  if (!helper || helper.verificationStatus !== 'VERIFIED' || helper.isHidden) {
    throw new ApiError('Helper not found.', 404, 'HELPER_NOT_FOUND');
  }
  if (String(helper.userId) === String(seekerId)) {
    throw new ApiError('You cannot review your own helper profile.', 409, 'CANNOT_REVIEW_SELF');
  }
  assertNoContactInfo({ comment });
  const [hasConnected, hasBooked] = await Promise.all([
    Connection.exists({ seekerId, helperId }),
    Booking.exists({ consumerId: seekerId, helperId }),
  ]);
  if (!hasConnected && !hasBooked) {
    throw new ApiError('Connect or book with this provider before leaving a review.', 403, 'CONNECTION_REQUIRED');
  }

  const existing = await Review.findOne({ helperId, seekerId });
  let review;
  let updated;
  if (existing) {
    existing.rating = rating;
    existing.comment = comment ?? '';
    await existing.save();
    review = existing;
    updated = true;
  } else {
    try {
      review = await Review.create({ helperId, seekerId, rating, comment: comment ?? '' });
      updated = false;
    } catch (error) {
      // 7.1: parallel first reviews — the unique pair index wins; retry as edit.
      if (error?.code !== 11000) throw error;
      const winner = await Review.findOne({ helperId, seekerId });
      if (!winner) throw error;
      winner.rating = rating;
      winner.comment = comment ?? '';
      await winner.save();
      review = winner;
      updated = true;
    }
  }

  // Override #6: recompute from aggregation — averages never drift on edits.
  const [agg] = await Review.aggregate([
    { $match: { helperId: review.helperId } },
    { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
  ]);
  const ratingAvg = Math.round((agg?.avg ?? 0) * 100) / 100;
  const ratingCount = agg?.count ?? 0;
  await Helper.updateOne({ _id: helperId }, { $set: { ratingAvg, ratingCount } });

  if (!updated) {
    void notifyUsers({ userIds: [helper.userId], type: 'HELPER_NEW_REVIEW', payload: { helperId: String(helperId), rating } }).catch(() => {});
  }
  return { review, ratingAvg, ratingCount, updated };
}

export async function flagHelper({ userId, helperId, reason }) {
  const helper = await Helper.findById(helperId);
  if (!helper || helper.verificationStatus !== 'VERIFIED') {
    throw new ApiError('Helper not found.', 404, 'HELPER_NOT_FOUND');
  }
  if (String(helper.userId) === String(userId)) {
    throw new ApiError('You cannot flag your own helper profile.', 409, 'CANNOT_FLAG_SELF');
  }

  try {
    await HelperFlag.create({ helperId, userId, reason });
  } catch (error) {
    if (error?.code === 11000) {
      throw new ApiError('You have already flagged this helper.', 409, 'ALREADY_FLAGGED');
    }
    throw error;
  }

  const flagCount = await HelperFlag.countDocuments({ helperId, dismissed: false });
  await Helper.updateOne({ _id: helperId }, { $set: { flagCount } });

  const hidden = await Helper.findOneAndUpdate(
    { _id: helperId, isHidden: false, flagCount: { $gte: AUTO_HIDE_FLAG_THRESHOLD } },
    { $set: { isHidden: true } },
    { returnDocument: 'after' },
  );
  if (hidden) {
    await AuditLog.create({ action: 'HELPER_AUTO_HIDDEN', meta: { helperId: String(helperId), flagCount } });
    void notifyUsers({ userIds: [helper.userId], type: 'HELPER_AUTO_HIDDEN', payload: { helperId: String(helperId) } }).catch(() => {});
  }
  return { flagCount, isHidden: !!hidden };
}

export async function getMyConnectedHelpers(seekerId, { page = 1, limit = 10 } = {}) {
  const connections = await Connection.find({ seekerId }).sort({ createdAt: -1 }).lean();
  const latestByHelper = new Map();
  for (const c of connections) {
    const key = String(c.helperId);
    if (!latestByHelper.has(key)) latestByHelper.set(key, c.createdAt);
  }
  const ids = [...latestByHelper.keys()];
  const total = ids.length;
  const pageIds = ids.slice((page - 1) * limit, page * limit);

  const [helpers, myReviews] = await Promise.all([
    Helper.find({ _id: { $in: pageIds } }).select('-phone -userId -rejectionReason -flagCount').lean(),
    Review.find({ seekerId, helperId: { $in: pageIds } }).select('helperId').lean(),
  ]);
  const reviewed = new Set(myReviews.map((r) => String(r.helperId)));

  const items = pageIds
    .map((id) => {
      const helper = helpers.find((h) => String(h._id) === id);
      return helper
        ? { helper: { ...helper, serviceLocation: publicServiceLocation(helper.serviceLocation) }, lastConnectedAt: latestByHelper.get(id), hasReviewed: reviewed.has(id) }
        : null;
    })
    .filter(Boolean);

  return { items, pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) } };
}

export async function adminListHelpers({ page = 1, limit = 20, verificationStatus, isHidden, category } = {}) {
  const filter = {};
  if (verificationStatus) filter.verificationStatus = verificationStatus;
  if (isHidden !== undefined) filter.isHidden = isHidden === 'true';
  if (category) filter.categories = category;

  const [rows, total] = await Promise.all([
    Helper.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('userId', 'name email')
      .lean(),
    Helper.countDocuments(filter),
  ]);
  return { rows, pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) } };
}

/** Admin verify/reject/unhide. Audit snapshots carry ONLY the three fields. */
export async function adminPatchHelper(helperId, patch, actor) {
  const helper = await Helper.findById(helperId);
  if (!helper) throw new ApiError('Helper not found.', 404, 'HELPER_NOT_FOUND');

  const before = {
    verificationStatus: helper.verificationStatus,
    isHidden: helper.isHidden,
    rejectionReason: helper.rejectionReason,
  };

  const set = {};
  if (patch.verificationStatus) {
    set.verificationStatus = patch.verificationStatus;
    set.rejectionReason = patch.verificationStatus === 'REJECTED' ? (patch.rejectionReason ?? '') : '';
  }
  if (patch.isHidden !== undefined) {
    set.isHidden = patch.isHidden;
    if (patch.isHidden === false) {
      // Unhide dismisses existing flags; only non-dismissed flags count later.
      await HelperFlag.updateMany({ helperId, dismissed: false }, { $set: { dismissed: true } });
      set.flagCount = 0;
    }
  }

  const updated = await Helper.findByIdAndUpdate(helperId, { $set: set }, { returnDocument: 'after' });
  const after = {
    verificationStatus: updated.verificationStatus,
    isHidden: updated.isHidden,
    rejectionReason: updated.rejectionReason,
  };
  await AuditLog.create({
    action: 'HELPER_ADMIN_PATCH',
    actorId: actor.userId,
    actorRole: 'ADMIN',
    meta: { helperId: String(helperId), before, after },
  });
  let type = null;
  if (patch.verificationStatus === 'VERIFIED') type = 'HELPER_VERIFIED';
  else if (patch.verificationStatus === 'REJECTED') type = 'HELPER_REJECTED';
  else if (patch.isHidden === false) type = 'HELPER_UNHIDDEN';
  if (type) {
    void notifyUsers({
      userIds: [helper.userId],
      type,
      payload: { helperId: String(helperId), ...(type === 'HELPER_REJECTED' ? { rejectionReason: updated.rejectionReason } : {}) },
    }).catch(() => {});
  }
  return updated.toObject();
}
