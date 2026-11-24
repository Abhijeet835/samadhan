// Usage: node src/scripts/demo-mode.js on|off
import { connectDB, disconnectDB } from '../config/db.js';
import Settings from '../modules/wallet/settings.model.js';
import { ensureDefaultSettings, getEffectiveTierThresholds } from '../modules/wallet/wallet.service.js';

const mode = process.argv[2];
if (!['on', 'off'].includes(mode)) {
  console.error('Usage: npm run demo:on | npm run demo:off');
  process.exit(1);
}

await connectDB();
await ensureDefaultSettings();
await Settings.updateOne({ key: 'demoMode' }, { $set: { value: mode === 'on' } });
const thresholds = await getEffectiveTierThresholds();
console.log(`[demo] demoMode=${mode === 'on'} → Tier 1 = ${thresholds.tier1Paise} paise, Tier 2 = ${thresholds.tier2Paise} paise`);
await disconnectDB();
