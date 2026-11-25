import mongoose from 'mongoose';

import Booking from './booking.model.js';
import Helper from '../helpers/helper.model.js';
import AuditLog from '../tiers/auditLog.model.js';
import { chargeWallet, getCommissionPercent } from '../wallet/wallet.service.js';
import { notifyUsers } from '../notifications/notification.service.js';
import { assertNoContactInfo } from '../../utils/contactGuard.util.js';
import { ApiError } from '../../utils/apiResponse.js';

const CONSUMER_CANCELABLE = ['PENDING', 'ACCEPTED'];
const PROVIDER_TRANSITIONS = {
  PENDING: ['ACCEPTED', 'REJECTED'],
  ACCEPTED: ['IN_PROGRESS', 'COMPLETED', 'CANCELLED'],
  IN_PROGRESS: ['COMPLETED', 'CANCELLED'],
};

function esc(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export async function createBooking({ consumerId, data }) {
  assertNoContactInfo({ serviceTitle: data.serviceTitle, notes: data.notes });

  const existing = await Booking.findOne({ idempotencyKey: data.idempotencyKey }).lean();
  if (existing) {
    if (String(existing.consumerId) !== String(consumerId)) {
      throw new ApiError('Idempotency key belongs to another user.', 409, 'IDEMPOTENCY_KEY_CONFLICT');
    }
    return { booking: existing, idempotent: true };
  }

  const helper = await Helper.findById(data.helperId).lean();
  if (!helper || helper.verificationStatus !== 'VERIFIED' || helper.isHidden) {
    throw new ApiError('Service provider not found or not available.', 404, 'HELPER_NOT_FOUND');
  }
  if (String(helper.userId) === String(consumerId)) {
    throw new ApiError('You cannot book your own service listing.', 409, 'CANNOT_BOOK_SELF');
  }

  const amountPaise = data.amountPaise ?? helper.basePricePaise ?? 29900;
  const commissionRatePercent = await getCommissionPercent();
  const commissionPaise = Math.round((amountPaise * commissionRatePercent) / 100);
  const providerPayoutPaise = amountPaise - commissionPaise;
  const category = data.category || helper.categories[0];

  const bookingId = new mongoose.Types.ObjectId();
  const session = await mongoose.startSession();
  let createdBooking;
  let walletBalancePaise;

  try {
    await session.withTransaction(async () => {
      const dup = await Booking.findOne({ idempotencyKey: data.idempotencyKey }).session(session).lean();
      if (dup) {
        if (String(dup.consumerId) !== String(consumerId)) {
          throw new ApiError('Idempotency key belongs to another user.', 409, 'IDEMPOTENCY_KEY_CONFLICT');
        }
        createdBooking = dup;
        return;
      }

      const { wallet } = await chargeWallet({
        userId: consumerId,
        type: 'BOOKING_PAYMENT',
        amountPaise: -amountPaise,
        bookingId,
        idempotencyKey: `BOOKING_PAY:${data.idempotencyKey}`,
        session,
      });
      walletBalancePaise = wallet.balancePaise;

      const [doc] = await Booking.create(
        [
          {
            _id: bookingId,
            consumerId,
            providerUserId: helper.userId,
            helperId: helper._id,
            category,
            serviceTitle: data.serviceTitle,
            scheduledDate: data.scheduledDate,
            timeSlot: data.timeSlot,
            serviceAddress: data.serviceAddress,
            notes: data.notes ?? '',
            amountPaise,
            commissionRatePercent,
            commissionPaise,
            providerPayoutPaise,
            status: 'PENDING',
            paymentStatus: 'HELD',
            idempotencyKey: data.idempotencyKey,
          },
        ],
        { session },
      );
      createdBooking = doc.toObject();
    });
  } catch (error) {
    if (error?.code === 11000) {
      const replay = await Booking.findOne({ idempotencyKey: data.idempotencyKey }).lean();
      if (replay && String(replay.consumerId) === String(consumerId)) {
        return { booking: replay, idempotent: true };
      }
      throw new ApiError('Idempotency key conflict.', 409, 'IDEMPOTENCY_KEY_CONFLICT');
    }
    throw error;
  } finally {
    await session.endSession();
  }

  void notifyUsers({
    userIds: [helper.userId],
    type: 'BOOKING_CREATED',
    payload: { bookingId: String(createdBooking._id), title: createdBooking.serviceTitle.slice(0, 120), amountPaise },
    dedupeKey: `booking:new:${createdBooking._id}`,
  }).catch(() => {});

  return { booking: createdBooking, walletBalancePaise, idempotent: false };
}

export async function listMyBookings(consumerId, { page = 1, limit = 15, status } = {}) {
  const filter = { consumerId };
  if (status) filter.status = status;

  const [items, total] = await Promise.all([
    Booking.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('helperId', 'displayName categories serviceLocation.city serviceLocation.state ratingAvg priceHint isSample')
      .lean(),
    Booking.countDocuments(filter),
  ]);

  return {
    items,
    pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
  };
}

export async function listProviderBookings(providerUserId, { page = 1, limit = 15, status } = {}) {
  const filter = { providerUserId };
  if (status) filter.status = status;

  const [items, total, agg] = await Promise.all([
    Booking.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('consumerId', 'name')
      .lean(),
    Booking.countDocuments(filter),
    Booking.aggregate([
      { $match: { providerUserId: new mongoose.Types.ObjectId(providerUserId), status: 'COMPLETED' } },
      {
        $group: {
          _id: null,
          completedCount: { $sum: 1 },
          grossPaise: { $sum: '$amountPaise' },
          commissionPaise: { $sum: '$commissionPaise' },
          netPayoutPaise: { $sum: '$providerPayoutPaise' },
        },
      },
    ]),
  ]);

  const safeItems = items.map((b) => ({
    ...b,
    consumerName: b.consumerId?.name ?? 'Customer',
    consumerId: b.consumerId?._id ?? b.consumerId,
  }));

  return {
    items: safeItems,
    summary: agg[0] ?? { completedCount: 0, grossPaise: 0, commissionPaise: 0, netPayoutPaise: 0 },
    pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
  };
}

export async function getBookingById(bookingId, viewerId, viewerRole) {
  const booking = await Booking.findById(bookingId)
    .populate('helperId', 'displayName categories serviceLocation.city serviceLocation.state ratingAvg')
    .populate('consumerId', 'name')
    .lean();
  if (!booking) throw new ApiError('Booking not found.', 404, 'BOOKING_NOT_FOUND');

  const isConsumer = String(booking.consumerId?._id ?? booking.consumerId) === String(viewerId);
  const isProvider = String(booking.providerUserId) === String(viewerId);
  const isAdmin = viewerRole === 'ADMIN';
  if (!isConsumer && !isProvider && !isAdmin) {
    throw new ApiError('You do not have access to this booking.', 403, 'FORBIDDEN');
  }
  return booking;
}

export async function transitionBooking({ bookingId, actorId, actorRole, nextStatus, note = '' }) {
  const session = await mongoose.startSession();
  let updated;
  let existing;

  try {
    await session.withTransaction(async () => {
      existing = await Booking.findById(bookingId).session(session);
      if (!existing) throw new ApiError('Booking not found.', 404, 'BOOKING_NOT_FOUND');

      const isConsumer = String(existing.consumerId) === String(actorId);
      const isProvider = String(existing.providerUserId) === String(actorId);
      const isAdmin = actorRole === 'ADMIN';

      if (!isConsumer && !isProvider && !isAdmin) {
        throw new ApiError('Forbidden.', 403, 'FORBIDDEN');
      }

      if (isConsumer && !isProvider && !isAdmin) {
        if (nextStatus !== 'CANCELLED' || !CONSUMER_CANCELABLE.includes(existing.status)) {
          throw new ApiError('Consumers can only cancel pending or accepted bookings.', 409, 'INVALID_TRANSITION');
        }
      } else {
        const allowed = PROVIDER_TRANSITIONS[existing.status] ?? [];
        if (!allowed.includes(nextStatus)) {
          throw new ApiError(`Cannot transition booking from ${existing.status} to ${nextStatus}.`, 409, 'INVALID_TRANSITION');
        }
      }

      const now = new Date();
      const set = { status: nextStatus, statusNote: note };
      if (nextStatus === 'ACCEPTED') set.acceptedAt = now;
      if (nextStatus === 'IN_PROGRESS') set.startedAt = now;
      if (nextStatus === 'COMPLETED') {
        set.completedAt = now;
        set.paymentStatus = 'SETTLED';
      }
      if (nextStatus === 'REJECTED' || nextStatus === 'CANCELLED') {
        set.cancelledAt = now;
        set.paymentStatus = 'REFUNDED';
      }

      updated = await Booking.findOneAndUpdate(
        { _id: bookingId, status: existing.status },
        { $set: set },
        { returnDocument: 'after', session },
      );
      if (!updated) throw new ApiError('Booking updated concurrently.', 409, 'INVALID_TRANSITION');

      if (nextStatus === 'COMPLETED') {
        await chargeWallet({
          userId: existing.providerUserId,
          type: 'BOOKING_PAYOUT',
          amountPaise: existing.providerPayoutPaise,
          bookingId: existing._id,
          idempotencyKey: `BOOKING_PAYOUT:${existing._id}`,
          session,
        });
        await Helper.updateOne(
          { _id: existing.helperId },
          { $inc: { bookingCount: 1, totalEarningsPaise: existing.providerPayoutPaise } },
          { session },
        );
        await AuditLog.create(
          [
            {
              action: 'BOOKING_COMPLETED_COMMISSION',
              actorId,
              actorRole: isAdmin ? 'ADMIN' : 'PROVIDER',
              entity: 'booking',
              entityId: String(existing._id),
              meta: {
                amountPaise: existing.amountPaise,
                commissionRatePercent: existing.commissionRatePercent,
                commissionPaise: existing.commissionPaise,
                providerPayoutPaise: existing.providerPayoutPaise,
              },
            },
          ],
          { session },
        );
      } else if (nextStatus === 'REJECTED' || nextStatus === 'CANCELLED') {
        await chargeWallet({
          userId: existing.consumerId,
          type: 'BOOKING_REFUND',
          amountPaise: existing.amountPaise,
          bookingId: existing._id,
          idempotencyKey: `BOOKING_REFUND:${existing._id}`,
          session,
        });
      }
    });
  } finally {
    await session.endSession();
  }

  const recipient = String(actorId) === String(updated.consumerId) ? updated.providerUserId : updated.consumerId;
  void notifyUsers({
    userIds: [recipient],
    type: 'BOOKING_UPDATED',
    payload: { bookingId: String(updated._id), status: updated.status, title: updated.serviceTitle.slice(0, 120) },
    dedupeKey: `booking:${updated._id}:${updated.status}`,
  }).catch(() => {});

  return updated.toObject();
}

export async function getPlatformCommissionSummary() {
  const [agg] = await Booking.aggregate([
    { $match: { status: 'COMPLETED' } },
    {
      $group: {
        _id: null,
        completedBookings: { $sum: 1 },
        grossBookingVolumePaise: { $sum: '$amountPaise' },
        totalCommissionPaise: { $sum: '$commissionPaise' },
        totalProviderPayoutPaise: { $sum: '$providerPayoutPaise' },
      },
    },
  ]);
  return agg ?? { completedBookings: 0, grossBookingVolumePaise: 0, totalCommissionPaise: 0, totalProviderPayoutPaise: 0 };
}

export function buildProviderTextFilter({ state, city, q }) {
  const match = {};
  if (state) match['serviceLocation.state'] = new RegExp(`^${esc(state)}$`, 'i');
  if (city) match['serviceLocation.city'] = new RegExp(esc(city), 'i');
  if (q?.trim()) {
    const rx = new RegExp(esc(q.trim()), 'i');
    match.$or = [{ displayName: rx }, { bio: rx }, { 'serviceLocation.city': rx }, { 'serviceLocation.state': rx }];
  }
  return match;
}
