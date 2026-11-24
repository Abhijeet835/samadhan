import Issue from '../issues/issue.model.js';
import AuditLog from './auditLog.model.js';
import { getEffectiveTierThresholds } from '../wallet/wallet.service.js';
import { matchAuthority } from '../authorities/authority.service.js';
import { ensureDispatchRow, runDispatchRow } from '../dispatch/dispatch.service.js';

/**
 * Race-safe tier claims. Called AFTER a payment transaction commits — never
 * inside it. Each tier is claimed with ONE conditional update whose filter
 * contains the threshold and status checks (no stale read). Only a non-null
 * result runs that tier's side effects; a call may claim both tiers.
 *
 * Returns { claimedTiers, done }: claims are awaited, side effects run in the
 * background (HTTP must not wait for SMTP/n8n). Tests await `done`.
 */
export async function checkTiers(issueId) {
  const thresholds = await getEffectiveTierThresholds();
  const claimedTiers = [];

  for (const tier of [1, 2]) {
    const threshold = tier === 1 ? thresholds.tier1Paise : thresholds.tier2Paise;
    const updated = await Issue.findOneAndUpdate(
      {
        _id: issueId,
        status: { $ne: 'REJECTED' },
        fundPaise: { $gte: threshold },
        tiersReached: { $ne: tier },
      },
      {
        $addToSet: { tiersReached: tier },
        $max: { tier },
        $set: { [`tier${tier}ReachedAt`]: new Date() },
      },
      { returnDocument: 'after' },
    );
    if (!updated) continue;
    claimedTiers.push(tier);

    // Claim-time work is failure-isolated: it must never break the payment.
    try {
      await AuditLog.create({
        action: 'TIER_CLAIMED',
        issueId,
        tier,
        fundPaiseSnapshot: updated.fundPaise,
        meta: { threshold },
      });
      if (tier === 1) {
        const authority = await matchAuthority(updated);
        if (authority) {
          await Issue.updateOne({ _id: issueId }, { $set: { authorityId: authority._id } });
        }
      }
    } catch (error) {
      console.error(`[tiers] claim-time step failed (tier ${tier}):`, error.message);
    }
  }

  // Dispatch rows are created at claim time; the unique index dedupes.
  const rows = [];
  try {
    if (claimedTiers.length) {
      const issue = await Issue.findById(issueId).lean();
      for (const tier of claimedTiers) {
        if (tier === 1) {
          rows.push(await ensureDispatchRow({ issueId, tier, channel: 'N8N_WEBHOOK', authorityId: issue.authorityId ?? null }));
          // Phase 6: social posts + trending   // Phase 8: notify reporter and supporters
        } else {
          rows.push(await ensureDispatchRow({ issueId, tier, channel: 'EMAIL', authorityId: issue.authorityId ?? null }));
          rows.push(await ensureDispatchRow({ issueId, tier, channel: 'N8N_WEBHOOK', authorityId: issue.authorityId ?? null }));
          // Phase 6: stronger social bundle + landing feature + appeal card unlock
        }
      }
    }
  } catch (error) {
    console.error('[tiers] dispatch row creation failed:', error.message);
  }

  const done = (async () => {
    for (const row of rows) {
      try {
        await runDispatchRow(row._id);
      } catch (error) {
        console.error('[tiers] dispatch step failed:', error.message);
      }
    }
  })();

  return { claimedTiers, done };
}

/** Admin re-check after thresholds change — already-claimed tiers stay claimed. */
export async function recheckTiers(issueId) {
  return checkTiers(issueId);
}
