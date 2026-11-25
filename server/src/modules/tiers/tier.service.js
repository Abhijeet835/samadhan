import Issue from '../issues/issue.model.js';
import IssueSupport from '../issues/issueSupport.model.js';
import AuditLog from './auditLog.model.js';
import { getEffectiveTierThresholds } from '../wallet/wallet.service.js';
import { matchAuthority } from '../authorities/authority.service.js';
import { ensureDispatchRow, runDispatchRow } from '../dispatch/dispatch.service.js';
import { generateBundle } from '../social/social.service.js';
import { notifyUsers } from '../notifications/notification.service.js';

/**
 * Race-safe Dynamic Importance Threshold & Public Explosion engine.
 * Called AFTER a payment/support transaction commits — never inside it.
 * Atomically claims `explosionTriggered` when a Social Explosion issue meets
 * its SMALL/MEDIUM/LARGE supporter threshold or a Pool Funds issue meets its
 * funding goal, then triggers awareness campaigns (Instagram/X) & notifications.
 */
export async function checkTiers(issueId) {
  const thresholds = await getEffectiveTierThresholds();
  const claimedTiers = [];
  let explosionClaimed = false;

  const doc = await Issue.findById(issueId).lean();
  if (doc && doc.status !== 'REJECTED' && !doc.explosionTriggered) {
    const isPool = doc.issueType === 'POOL_FUNDS';
    const reached = isPool
      ? (doc.fundingGoalPaise > 0 && doc.fundPaise >= doc.fundingGoalPaise)
      : (doc.supporterCount >= (doc.thresholdTarget || 5));

    if (reached) {
      const filter = {
        _id: issueId,
        status: { $ne: 'REJECTED' },
        explosionTriggered: { $ne: true },
        ...(isPool
          ? { $expr: { $gte: ['$fundPaise', '$fundingGoalPaise'] } }
          : { $expr: { $gte: ['$supporterCount', '$thresholdTarget'] } }),
      };
      const claimed = await Issue.findOneAndUpdate(
        filter,
        {
          $set: { explosionTriggered: true, explosionTriggeredAt: new Date() },
        },
        { returnDocument: 'after' },
      );
      if (claimed) {
        explosionClaimed = true;
        try {
          await AuditLog.create({
            action: isPool ? 'POOL_GOAL_REACHED' : 'EXPLOSION_TRIGGERED',
            issueId,
            fundPaiseSnapshot: claimed.fundPaise,
            meta: {
              issueType: claimed.issueType,
              importance: claimed.importance,
              thresholdTarget: claimed.thresholdTarget,
              fundingGoalPaise: claimed.fundingGoalPaise,
              supporterCount: claimed.supporterCount,
            },
          });
          const authority = await matchAuthority(claimed);
          if (authority) {
            await Issue.updateOne({ _id: issueId }, { $set: { authorityId: authority._id } });
          }
        } catch (error) {
          console.error('[threshold] claim-time audit/authority step failed:', error.message);
        }
      }
    }
  }

  // Also preserve atomic fund-threshold claim compatibility when fundPaise crosses settings thresholds.
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
    if (!claimedTiers.includes(tier)) claimedTiers.push(tier);

    try {
      await AuditLog.create({
        action: 'TIER_CLAIMED',
        issueId,
        tier,
        fundPaiseSnapshot: updated.fundPaise,
        meta: { threshold },
      });
      if (tier === 1 && !updated.authorityId) {
        const authority = await matchAuthority(updated);
        if (authority) {
          await Issue.updateOne({ _id: issueId }, { $set: { authorityId: authority._id } });
        }
      }
    } catch (error) {
      console.error(`[tiers] claim-time step failed (tier ${tier}):`, error.message);
    }
  }

  const rows = [];
  try {
    const bundleTiers = new Set(claimedTiers);
    if (explosionClaimed) bundleTiers.add(1);
    if (bundleTiers.size) {
      const issue = await Issue.findById(issueId).lean();
      for (const tier of bundleTiers) {
        if (tier === 1) {
          rows.push(await ensureDispatchRow({ issueId, tier, channel: 'N8N_WEBHOOK', authorityId: issue.authorityId ?? null }));
        } else {
          rows.push(await ensureDispatchRow({ issueId, tier, channel: 'EMAIL', authorityId: issue.authorityId ?? null }));
          rows.push(await ensureDispatchRow({ issueId, tier, channel: 'N8N_WEBHOOK', authorityId: issue.authorityId ?? null }));
        }
      }
    }
  } catch (error) {
    console.error('[tiers] dispatch row creation failed:', error.message);
  }

  const done = (async () => {
    const bundleTiers = new Set(claimedTiers);
    if (explosionClaimed) bundleTiers.add(1);
    if (explosionClaimed) {
      try {
        const issue = await Issue.findById(issueId).select('reporterId title issueType').lean();
        const supporterIds = await IssueSupport.find({ issueId }).distinct('userId');
        await notifyUsers({
          userIds: [issue?.reporterId, ...supporterIds],
          type: issue?.issueType === 'POOL_FUNDS' ? 'POOL_GOAL_REACHED' : 'EXPLOSION_TRIGGERED',
          payload: { issueId: String(issueId), title: String(issue?.title ?? '').slice(0, 120) },
          dedupeKey: `explosion:${issueId}`,
        });
      } catch (error) {
        console.error('[threshold] notification failed:', error.message);
      }
    }
    for (const tier of claimedTiers) {
      try {
        const issue = await Issue.findById(issueId).select('reporterId title').lean();
        const supporterIds = await IssueSupport.find({ issueId }).distinct('userId');
        await notifyUsers({
          userIds: [issue?.reporterId, ...supporterIds],
          type: tier === 1 ? 'TIER_1_REACHED' : 'TIER_2_REACHED',
          payload: { issueId: String(issueId), title: String(issue?.title ?? '').slice(0, 120), tier },
          dedupeKey: `tier:${issueId}:${tier}`,
        });
      } catch (error) {
        console.error('[tiers] notification failed:', error.message);
      }
    }
    for (const tier of bundleTiers) {
      try {
        const bundle = await generateBundle({ issueId, tier });
        await bundle.done;
      } catch (error) {
        console.error('[tiers] social bundle failed:', error.message);
      }
    }
    for (const row of rows) {
      try {
        await runDispatchRow(row._id);
      } catch (error) {
        console.error('[tiers] dispatch step failed:', error.message);
      }
    }
  })();

  return { claimedTiers, explosionClaimed, done };
}

export const checkIssueThreshold = checkTiers;

export async function recheckTiers(issueId) {
  return checkTiers(issueId);
}
