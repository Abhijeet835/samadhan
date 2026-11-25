import mongoose from 'mongoose';

export const NOTIFICATION_TYPES = [
  'TIER_1_REACHED',
  'TIER_2_REACHED',
  'EXPLOSION_TRIGGERED',
  'POOL_GOAL_REACHED',
  'ISSUE_STATUS_CHANGED',
  'ISSUE_REJECTED',
  'ISSUE_AUTHORITY_REPLY',
  'ISSUE_PLATFORM_CREDIT',
  'HELPER_VERIFIED',
  'HELPER_REJECTED',
  'HELPER_AUTO_HIDDEN',
  'HELPER_UNHIDDEN',
  'HELPER_REVERIFICATION_REQUIRED',
  'HELPER_NEW_REVIEW',
  'HELPER_NEW_CONNECT',
  'BOOKING_CREATED',
  'BOOKING_UPDATED',
];

export const NOTIFICATION_TTL_DAYS = 90;

const notificationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: NOTIFICATION_TYPES, required: true },
    // Small PII-free object: ids, public title ≤120, status/tier, amounts in paise.
    payload: { type: mongoose.Schema.Types.Mixed, default: {} },
    dedupeKey: { type: String, default: null },
    readAt: { type: Date, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

notificationSchema.index({ userId: 1, readAt: 1, createdAt: -1 });
notificationSchema.index(
  { userId: 1, dedupeKey: 1 },
  { unique: true, partialFilterExpression: { dedupeKey: { $type: 'string' } } },
);
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: NOTIFICATION_TTL_DAYS * 24 * 60 * 60 });

const Notification = mongoose.model('Notification', notificationSchema);

export default Notification;
