import DispatchLog from '../modules/dispatch/dispatchLog.model.js';
import { runDispatchRow } from '../modules/dispatch/dispatch.service.js';

const STUCK_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;

/**
 * Re-run rows stuck in PENDING for > 10 minutes (server crashed after claim).
 * FAILED rows are NOT auto-retried — that is an explicit admin action.
 */
export async function runDispatchSweepOnce() {
  const cutoff = new Date(Date.now() - STUCK_MS);
  const stuck = await DispatchLog.find({
    status: 'PENDING',
    updatedAt: { $lte: cutoff },
    attempts: { $lt: MAX_ATTEMPTS },
  })
    .select('_id')
    .lean();

  let rerun = 0;
  for (const row of stuck) {
    try {
      await runDispatchRow(row._id);
      rerun += 1;
    } catch (error) {
      console.error(`[dispatch-sweep] row ${row._id}: ${error.message}`);
    }
  }
  console.log(`[dispatch-sweep] stuck=${stuck.length} rerun=${rerun}`);
  return { stuck: stuck.length, rerun };
}
