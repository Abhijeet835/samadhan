import AuditLog from '../modules/tiers/auditLog.model.js';

// Per-entity snapshot whitelists — audit rows must NEVER carry secrets/PII
// (no phone, password, email, tokens).
const WHITELIST = {
  issue: ['status', 'tier', 'fundPaise', 'supporterCount', 'platformCreditPaise', 'authorityId'],
  user: ['isActive'],
  helper: ['verificationStatus', 'isHidden', 'rejectionReason'],
  settings: null, // settings snapshots are key→value of non-secret config only
  authority: ['nameEn', 'department', 'email', 'isActive', 'isFallback'],
  category: ['disabledIssueCategories', 'disabledHelperCategories'],
};

export function snapshot(entity, doc) {
  if (!doc) return null;
  const plain = typeof doc.toObject === 'function' ? doc.toObject() : doc;
  const fields = WHITELIST[entity];
  if (!fields) return plain;
  const out = {};
  for (const f of fields) if (plain[f] !== undefined) out[f] = plain[f];
  return out;
}

/**
 * Write an immutable audit row. Pass `session` to write in the SAME transaction
 * as the mutation. Failure here must not silently pass for admin mutations,
 * but callers wrap notification-style side effects separately.
 */
export async function writeAudit({ actor, action, entity, entityId, before, after, meta, session }) {
  const [row] = await AuditLog.create(
    [
      {
        action,
        actorId: actor?.userId ?? null,
        actorRole: actor?.role ?? 'SYSTEM',
        entity: entity ?? null,
        entityId: entityId != null ? String(entityId) : null,
        before: before ?? null,
        after: after ?? null,
        meta: meta ?? {},
      },
    ],
    session ? { session } : {},
  );
  return row;
}
