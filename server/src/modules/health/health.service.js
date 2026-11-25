import mongoose from 'mongoose';
import { getDbState } from '../../config/db.js';
import { env } from '../../config/env.js';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

let version = '0.0.0';
try {
  version = JSON.parse(readFileSync(fileURLToPath(new URL('../../../package.json', import.meta.url)), 'utf8')).version;
} catch { /* keep default */ }

const startedAt = Date.now();

export function getHealthStatus() {
  const state = getDbState();
  const mongo = !env.mongoUri ? 'disabled' : state === 'connected' ? 'connected' : 'disconnected';
  return {
    status: 'ok',
    db: state,
    mongo,
    uptimeSec: Math.round((Date.now() - startedAt) / 1000),
    version,
    commit: env.renderGitCommit,
    timestamp: new Date().toISOString(),
  };
}
