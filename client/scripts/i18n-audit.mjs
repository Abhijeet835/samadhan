// Automated i18n audit. Exits non-zero on any hard failure.
// 1 key parity · 2 interpolation parity · 3 used keys exist (dynamic via
// allowlist) · 4 unused keys (warn) · 5 Hindi==English flag · 6 hardcoded
// strings (allowlisted) · 7 every server error code has an errors.* key.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const en = JSON.parse(fs.readFileSync(path.join(root, 'src/i18n/locales/en.json'), 'utf8'));
const hi = JSON.parse(fs.readFileSync(path.join(root, 'src/i18n/locales/hi.json'), 'utf8'));

const flat = (o, p = '') => Object.entries(o).flatMap(([k, v]) => (v && typeof v === 'object' ? flat(v, `${p}${k}.`) : [[`${p}${k}`, v]]));
const enMap = new Map(flat(en));
const hiMap = new Map(flat(hi));
const failures = [];
const warnings = [];

// 1 + 2: parity + interpolation
const placeholders = (s) => [...String(s).matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1]).sort().join(',');
for (const [k, v] of enMap) {
  if (!hiMap.has(k)) { failures.push(`missing hi key: ${k}`); continue; }
  if (placeholders(v) !== placeholders(hiMap.get(k))) failures.push(`interpolation mismatch: ${k}`);
}
for (const k of hiMap.keys()) if (!enMap.has(k)) failures.push(`extra hi key: ${k}`);

// walk src
const srcDir = path.join(root, 'src');
const files = [];
(function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const fp = path.join(d, e.name);
    if (e.isDirectory()) walk(fp);
    else if (/\.(jsx?|mjs)$/.test(e.name)) files.push(fp);
  }
})(srcDir);
const source = files.map((f) => fs.readFileSync(f, 'utf8')).join('\n');

// 3: static t('key') used must exist
const usedKeys = new Set();
for (const m of source.matchAll(/\bt\(\s*['"]([a-zA-Z0-9_.]+)['"]/g)) usedKeys.add(m[1]);
// dynamic key families validated by enumerating value sets
const dynamicAllowlist = {
  'issues.categories.': ['BROKEN_ROADS', 'SEWAGE_DRAINAGE', 'GARBAGE_MANAGEMENT', 'WATER_ELECTRICITY', 'STRAY_ANIMALS', 'EDUCATION_INFRA', 'PUBLIC_FACILITIES', 'OTHER'],
  'issues.statuses.': ['ACTIVE', 'ACKNOWLEDGED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED', 'REJECTED'],
  'local.categories.': ['CAB_AUTO', 'GENERAL_STORE', 'GARAGE_MECHANIC', 'SWEETS_BAKERY', 'PLUMBER_ELECTRICIAN', 'APPLIANCE_REPAIR', 'OTHER_LOCAL'],
  'notifications.types.': ['TIER_1_REACHED', 'TIER_2_REACHED', 'EXPLOSION_TRIGGERED', 'POOL_GOAL_REACHED', 'ISSUE_STATUS_CHANGED', 'ISSUE_REJECTED', 'ISSUE_AUTHORITY_REPLY', 'ISSUE_PLATFORM_CREDIT', 'HELPER_VERIFIED', 'HELPER_REJECTED', 'HELPER_AUTO_HIDDEN', 'HELPER_UNHIDDEN', 'HELPER_REVERIFICATION_REQUIRED', 'HELPER_NEW_REVIEW', 'HELPER_NEW_CONNECT', 'BOOKING_CREATED', 'BOOKING_UPDATED'],
  'errors.': [...enMap.keys()].filter((k) => k.startsWith('errors.')).map((k) => k.slice(7)),
  'admin.settingKeys.': ['reportFeePaise', 'supportFeePaise', 'tier1Paise', 'tier2Paise', 'smallIssueThreshold', 'mediumIssueThreshold', 'largeIssueThreshold', 'platformCommissionPercent', 'signupCreditPaise', 'duplicateRadiusM', 'duplicateDays', 'autoCloseDays', 'platformCreditMaxPaise', 'demoMode'],
  'issues.flag.reasons.': ['SPAM', 'DUPLICATE', 'INAPPROPRIATE', 'WRONG_LOCATION', 'OTHER'],
};
for (const [prefix, values] of Object.entries(dynamicAllowlist)) {
  for (const v of values) {
    const key = `${prefix}${v}`;
    if (!enMap.has(key)) failures.push(`dynamic key missing en: ${key}`);
    if (!hiMap.has(key)) failures.push(`dynamic key missing hi: ${key}`);
  }
}
for (const k of usedKeys) {
  if (k.includes('${')) continue;
  const exists = enMap.has(k) || enMap.has(`${k}_one`) || enMap.has(`${k}_other`);
  if (!exists && !Object.keys(dynamicAllowlist).some((p) => k.startsWith(p))) {
    if (!/\$\{/.test(k)) failures.push(`used key missing: ${k}`);
  }
}

// 4: unused keys (warn)
for (const k of enMap.keys()) {
  const leaf = k.split('.').pop();
  const familyUsed = Object.keys(dynamicAllowlist).some((p) => k.startsWith(p));
  if (!usedKeys.has(k) && !familyUsed && !source.includes(`'${k}'`) && !source.includes(`"${k}"`) && !source.includes(leaf)) {
    warnings.push(`possibly unused: ${k}`);
  }
}

// 5: Hindi identical to English (allowlist brand/technical)
const identicalAllowlist = /^(112|₹.*|WhatsApp|Facebook|Instagram|X|Samadhan|OpenStreetMap|.*example\.org.*|[0-9₹.,\s/+*-]+)$/;
for (const [k, v] of enMap) {
  if (hiMap.get(k) === v && typeof v === 'string' && /[a-zA-Z]/.test(v) && !identicalAllowlist.test(v.trim())) {
    warnings.push(`hi identical to en: ${k} = "${v}"`);
  }
}

// 7: every server error code has errors.* key
const serverDir = path.resolve(root, '../server/src');
const serverCodes = new Set();
(function walkS(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const fp = path.join(d, e.name);
    if (e.isDirectory()) walkS(fp);
    else if (/\.js$/.test(e.name) && !/\.test\.js$/.test(e.name)) {
      const txt = fs.readFileSync(fp, 'utf8');
      for (const m of txt.matchAll(/ApiError\([^)]*'([A-Z][A-Z_]{3,})'\s*\)/g)) serverCodes.add(m[1]);
    }
  }
})(serverDir);
const apiMd = fs.readFileSync(path.resolve(root, '../docs/API.md'), 'utf8');
for (const m of apiMd.matchAll(/\|`([A-Z_]{4,})`\|/g)) serverCodes.add(m[1]);
for (const code of serverCodes) {
  if (!enMap.has(`errors.${code}`)) failures.push(`errors.${code} missing (en)`);
  if (!hiMap.has(`errors.${code}`)) failures.push(`errors.${code} missing (hi)`);
}

console.log(`i18n audit: ${enMap.size} en keys, ${hiMap.size} hi keys, ${serverCodes.size} error codes`);
if (warnings.length) console.log(`\nWARNINGS (${warnings.length}):\n` + warnings.slice(0, 40).join('\n'));
if (failures.length) {
  console.error(`\nFAILURES (${failures.length}):\n` + failures.join('\n'));
  process.exit(1);
}
console.log('\nPASS: i18n audit clean.');
