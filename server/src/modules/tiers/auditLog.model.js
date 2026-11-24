import mongoose from 'mongoose';

// Immutable audit trail for tier claims. Rows are only ever inserted.
const auditLogSchema = new mongoose.Schema(
  {
    action: { type: String, required: true },
    issueId: { type: mongoose.Schema.Types.ObjectId, ref: 'Issue', default: null },
    tier: { type: Number, default: null },
    actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    actorRole: { type: String, default: 'SYSTEM' },
    fundPaiseSnapshot: { type: Number, default: null },
    meta: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

auditLogSchema.index({ createdAt: -1 });

const AuditLog = mongoose.model('AuditLog', auditLogSchema);

export default AuditLog;
