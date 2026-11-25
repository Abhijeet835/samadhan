import { env, isProduction } from '../config/env.js';

// Demo/sample seeds refuse production unless ALLOW_DEMO_SEED=true.
export function guardDemoSeed() {
  if (isProduction && !env.allowDemoSeed) {
    console.error('[seed] Refusing to run demo/sample seed in production. Set ALLOW_DEMO_SEED=true to override (then remove it).');
    process.exit(1);
  }
}

// Admin seed is exempt but requires a strong password in production.
export function guardAdminSeed() {
  if (isProduction && String(env.adminPassword).length < 12) {
    console.error('[seed:admin] Production requires a strong ADMIN_PASSWORD (≥ 12 chars).');
    process.exit(1);
  }
}
