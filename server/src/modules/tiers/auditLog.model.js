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
    // Phase 8B: generic entity audit (backward compatible — old rows still read).
    entity: { type: String, default: null },
    entityId: { type: String, default: null },
    before: { type: mongoose.Schema.Types.Mixed, default: null },
    after: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index({ entity: 1, entityId: 1, createdAt: -1 });

const AuditLog = mongoose.model('AuditLog', auditLogSchema);

export default AuditLog;
