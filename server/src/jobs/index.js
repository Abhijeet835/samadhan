import cron from 'node-cron';

import { env } from '../config/env.js';
import { runAutoCloseOnce } from './autoClose.job.js';
import { runDispatchSweepOnce } from './dispatchSweep.job.js';

export { runAutoCloseOnce } from './autoClose.job.js';
export { runDispatchSweepOnce } from './dispatchSweep.job.js';

/** Register cron jobs AFTER the DB is connected. Skipped in tests / when disabled. */
export function registerJobs() {
  if (env.nodeEnv === 'test' || !env.enableCron) {
    console.log('[jobs] Cron disabled (test env or ENABLE_CRON=false).');
    return;
  }
  cron.schedule('0 * * * *', () => {
    runAutoCloseOnce().catch((error) => console.error('[jobs] autoclose run failed:', error.message));
  });
  cron.schedule('*/10 * * * *', () => {
    runDispatchSweepOnce().catch((error) => console.error('[jobs] dispatch sweep failed:', error.message));
  });
  console.log('[jobs] Registered: autoClose (hourly), dispatchSweep (every 10 min).');
}
