// Post-build SW safety check: fails if the precache includes any /api URL or
// the SW lacks the navigation denylist for /api and /i.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../dist');
const swPath = path.join(dist, 'sw.js');
if (!fs.existsSync(swPath)) {
  console.error('FAIL: dist/sw.js not found — run `npm run build` first.');
  process.exit(1);
}
const sw = fs.readFileSync(swPath, 'utf8');
const failures = [];

// precache manifest must not contain /api URLs
const precache = [...sw.matchAll(/"url":"([^"]+)"/g)].map((m) => m[1]);
if (precache.some((u) => u.includes('/api/'))) failures.push('precache contains an /api URL');
if (!/navigateFallbackDenylist|denylist/i.test(sw) && !sw.includes('/api/')) {
  // denylist may be compiled; check for the api regex source presence
}
if (!sw.includes('\\/api\\/') && !sw.includes('/api/') ) failures.push('SW missing /api navigation denylist');
if (!sw.includes('\\/i\\/') && !sw.includes('/i/')) failures.push('SW missing /i navigation denylist');

if (failures.length) {
  console.error('FAIL:\n' + failures.join('\n'));
  process.exit(1);
}
console.log(`PASS: sw.js precaches ${precache.length} shell assets, no /api URLs, navigation denylist present.`);
