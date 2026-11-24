import mongoose from 'mongoose';

export const DISPATCH_CHANNELS = ['EMAIL', 'N8N_WEBHOOK'];
export const DISPATCH_STATUSES = ['PENDING', 'SENT', 'SIMULATED', 'FAILED', 'SKIPPED', 'CANCELLED'];

const dispatchLogSchema = new mongoose.Schema(
  {
    issueId: { type: mongoose.Schema.Types.ObjectId, ref: 'Issue', required: true },
    tier: { type: Number, enum: [1, 2], required: true },
    channel: { type: String, enum: DISPATCH_CHANNELS, required: true },
    status: { type: String, enum: DISPATCH_STATUSES, default: 'PENDING' },
    reason: { type: String, default: '' },
    authorityId: { type: mongoose.Schema.Types.ObjectId, ref: 'Authority', default: null },
    to: { type: String, default: '' },
    subject: { type: String, default: '' },
    bodyText: { type: String, default: '' },
    bodyHtml: { type: String, default: '' },
    attempts: { type: Number, default: 0, min: 0 },
    lastError: {
      type: String,
      default: '',
      maxlength: [500, 'lastError is truncated to 500 characters'],
    },
    messageId: { type: String, default: '' },
    sentAt: { type: Date, default: null },
  },
  { timestamps: true },
);

// One row per (issue, tier, channel) — a repeated claim can never duplicate it.
dispatchLogSchema.index({ issueId: 1, tier: 1, channel: 1 }, { unique: true });
dispatchLogSchema.index({ issueId: 1, sentAt: 1 });
dispatchLogSchema.index({ status: 1, updatedAt: 1 });

const DispatchLog = mongoose.model('DispatchLog', dispatchLogSchema);

export default DispatchLog;
