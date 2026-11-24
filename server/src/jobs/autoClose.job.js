import Issue from '../modules/issues/issue.model.js';
import { transitionIssue } from '../modules/issues/issue.service.js';
import { getSetting } from '../modules/wallet/wallet.service.js';

/**
 * Close RESOLVED issues whose resolution is older than settings.autoCloseDays.
 * One bad issue must never stop the loop. Exported for tests + npm script.
 */
export async function runAutoCloseOnce() {
  const windowDays = await getSetting('autoCloseDays');
  const cutoff = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);
  const due = await Issue.find({ status: 'RESOLVED', resolvedAt: { $lte: cutoff } })
    .select('_id')
    .lean();

  let closed = 0;
  let failed = 0;
  for (const issue of due) {
    try {
      await transitionIssue(issue._id, 'CLOSED', { role: 'SYSTEM' }, 'Auto-closed after resolution window');
      closed += 1;
    } catch (error) {
      failed += 1;
      console.error(`[autoclose] issue ${issue._id}: ${error.message}`);
    }
  }
  console.log(`[autoclose] due=${due.length} closed=${closed} failed=${failed}`);
  return { due: due.length, closed, failed };
}
