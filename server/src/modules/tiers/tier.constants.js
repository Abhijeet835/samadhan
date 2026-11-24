export const TIER_OPEN_STATUSES = ['ACTIVE', 'ACKNOWLEDGED', 'IN_PROGRESS'];

// AUDIT is a sync auditLogs write at claim time; the rest are dispatch rows.
export const TIER_STEPS = Object.freeze({
  1: ['AUDIT', 'N8N_WEBHOOK'],
  2: ['AUDIT', 'EMAIL', 'N8N_WEBHOOK'],
});
