import { env } from './config/env.js';
import app from './app.js';
import { connectDB, disconnectDB } from './config/db.js';
import { ensureDefaultSettings } from './modules/wallet/wallet.service.js';

const server = app.listen(env.port, () => {
  console.log(`[server] Samadhan API listening on http://localhost:${env.port}`);
  console.log(`[server] Health check: http://localhost:${env.port}/api/health`);
});

server.on('error', (error) => {
  console.error(`[server] Failed to start: ${error.message}`);
  process.exitCode = 1;
});

// Start listening first, then connect. The health endpoint must be reachable
// even while Atlas is connecting or when MONGO_URI is not configured yet.
connectDB().then(async (connection) => {
  if (!connection) return;
  try {
    await ensureDefaultSettings();
    console.log('[settings] Default settings ensured.');
  } catch (error) {
    console.error('[settings] Failed to ensure default settings:', error.message);
  }
});

let isShuttingDown = false;

const shutdown = (signal) => {
  if (isShuttingDown) return;
  isShuttingDown = true;
  console.log(`[server] ${signal} received. Closing HTTP server...`);

  server.close(async () => {
    await disconnectDB();
    process.exit(0);
  });

  // Do not hang forever if a socket refuses to close.
  setTimeout(() => {
    console.error('[server] Forced shutdown after timeout.');
    process.exit(1);
  }, 10_000).unref();
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

process.on('unhandledRejection', (reason) => {
  console.error('[server] Unhandled promise rejection:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('[server] Uncaught exception:', error);
  shutdown('uncaughtException');
});
