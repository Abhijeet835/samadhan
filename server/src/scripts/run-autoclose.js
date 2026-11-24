// Usage: npm run job:autoclose — one manual auto-close pass.
import { connectDB, disconnectDB } from '../config/db.js';
import { ensureDefaultSettings } from '../modules/wallet/wallet.service.js';
import { runAutoCloseOnce } from '../jobs/autoClose.job.js';

await connectDB();
await ensureDefaultSettings();
await runAutoCloseOnce();
await disconnectDB();
