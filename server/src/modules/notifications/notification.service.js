import Notification from './notification.model.js';
import { ApiError } from '../../utils/apiResponse.js';

/**
 * Fan-out notifications. ALWAYS called after a commit, never inside a
 * transaction. Failure-isolated: logs and never throws, so a notification
 * problem can never roll back a payment or block a tier/transition.
 */
export async function notifyUsers({ userIds, type, payload, dedupeKey }) {
  try {
    const ids = [...new Set((userIds ?? []).map((id) => String(id)).filter(Boolean))];
    for (let i = 0; i < ids.length; i += 500) {
      const batch = ids.slice(i, i + 500).map((userId) => ({
        userId,
        type,
        payload,
        ...(dedupeKey ? { dedupeKey } : {}),
      }));
      try {
        await Notification.insertMany(batch, { ordered: false });
      } catch (error) {
        // ordered:false still inserts non-duplicates; ignore duplicate-key noise.
        const writeErrors = error?.writeErrors ?? [];
        const nonDup = writeErrors.filter((e) => e?.code !== 11000);
        if (error?.code !== 11000 && nonDup.length) {
          console.error('[notify] insert failed:', error.message);
        }
      }
    }
  } catch (error) {
    console.error('[notify] fan-out failed:', error.message);
  }
}

export async function listNotifications(userId, { page = 1, limit = 20, unreadOnly = false } = {}) {
  const filter = { userId, ...(unreadOnly ? { readAt: null } : {}) };
  const [items, total, unreadCount] = await Promise.all([
    Notification.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    Notification.countDocuments(filter),
    Notification.countDocuments({ userId, readAt: null }),
  ]);
  return {
    items,
    unreadCount,
    pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
  };
}

export async function getUnreadCount(userId) {
  return { unreadCount: await Notification.countDocuments({ userId, readAt: null }) };
}

export async function markRead(userId, id) {
  const doc = await Notification.findOne({ _id: id, userId });
  if (!doc) throw new ApiError('Notification not found.', 404, 'NOTIFICATION_NOT_FOUND');
  if (!doc.readAt) {
    doc.readAt = new Date();
    await doc.save();
  }
  const unreadCount = await Notification.countDocuments({ userId, readAt: null });
  return { notification: doc, unreadCount };
}

export async function markAllRead(userId) {
  const result = await Notification.updateMany({ userId, readAt: null }, { $set: { readAt: new Date() } });
  return { modifiedCount: result.modifiedCount ?? 0, unreadCount: 0 };
}
