import express from 'express';
import crypto from 'node:crypto';

import { env } from '../../config/env.js';
import { rateLimit } from '../../middleware/rateLimit.middleware.js';
import { runAutoCloseOnce } from '../../jobs/autoClose.job.js';
import { runDispatchSweepOnce } from '../../jobs/dispatchSweep.job.js';
import { sendSuccess } from '../../utils/apiResponse.js';

const router = express.Router();
const JOBS = { autoclose: runAutoCloseOnce, 'dispatch-sweep': runDispatchSweepOnce };

function safeEqual(a, b) {
  const ba = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  return ba.length === bb.length && crypto.timingSafeEqual(ba, bb);
}

// Free-tier hosts sleep → node-cron stops. External cron hits this endpoint.
// Disabled (404) when CRON_SECRET unset; otherwise constant-time secret check.
router.post('/jobs/:job', rateLimit({ windowMs: 60_000, max: 30 }), async (req, res, next) => {
  try {
    if (!env.cronSecret) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Not found.' } });
    const provided = req.get('X-Cron-Secret') ?? '';
    if (!safeEqual(provided, env.cronSecret)) {
      return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid cron secret.' } });
    }
    const fn = JOBS[req.params.job];
    if (!fn) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Unknown job.' } });
    const result = await fn();
    const affectedCount = result?.closed ?? result?.rerun ?? 0;
    return sendSuccess(res, { ran: true, affectedCount });
  } catch (error) {
    return next(error);
  }
});

export default router;
