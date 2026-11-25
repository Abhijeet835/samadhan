import mongoose from 'mongoose';

const issueUpdateSchema = new mongoose.Schema(
  {
    issueId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Issue',
      required: true,
    },
    fromStatus: {
      type: String,
      default: null,
    },
    toStatus: {
      type: String,
      default: null,
    },
    // Phase 8B: non-status timeline events.
    kind: {
      type: String,
      enum: ['STATUS', 'AUTHORITY_ASSIGNED', 'AUTHORITY_REPLY', 'PLATFORM_CREDIT', 'RESOLUTION_RECORDED', 'FUND_UTILIZATION'],
      default: 'STATUS',
    },
    authorityId: { type: mongoose.Schema.Types.ObjectId, ref: 'Authority', default: null },
    amountPaise: { type: Number, default: null },
    idempotencyKey: { type: String, default: null },
    actorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    actorRole: {
      type: String,
      enum: ['CONSUMER', 'PROVIDER', 'CITIZEN', 'HELPER', 'ADMIN', 'SYSTEM'],
      required: true,
    },
    note: {
      type: String,
      trim: true,
      maxlength: [500, 'Note cannot exceed 500 characters'],
      default: '',
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  },
);

issueUpdateSchema.index({ issueId: 1, createdAt: 1 });
issueUpdateSchema.index(
  { idempotencyKey: 1 },
  { unique: true, partialFilterExpression: { idempotencyKey: { $type: 'string' } } },
);

const IssueUpdate = mongoose.model('IssueUpdate', issueUpdateSchema);

export default IssueUpdate;