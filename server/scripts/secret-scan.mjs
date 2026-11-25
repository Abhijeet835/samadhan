// Scan git-tracked files for obvious secrets. Allowlist example placeholders.
import { execSync } from 'node:child_process';
import fs from 'node:fs';

const files = execSync('git ls-files', { encoding: 'utf8' }).split('\n').filter(Boolean);
const patterns = [
  /mongodb\+srv:\/\/[^$\s]*:[^$\s]+@/i,           // mongo URI with inline creds
  /-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /\bAIza[0-9A-Za-z_-]{30,}/,                      // Google API key
  /\bsk-[0-9A-Za-z]{20,}/,                         // OpenAI-style
  /(KEY|SECRET|TOKEN|PASSWORD)\s*[:=]\s*['"][0-9A-Za-z+/=_-]{32,}['"]/i,
];
const allow = [
  /\.env\.example$/, /package-lock\.json$/, /\.md$/, /seedDemo\.js$/, /verify-data\.js$/,
  /node_modules/, /dist\//,
];
const isPlaceholder = (line) => /example|placeholder|your[-_]|changeme|<.*>|xxx|REDACTED|samadhan_dev_jwt|Admin@12345|Demo@12345|Helper@12345|Test@12345/i.test(line);

const hits = [];
for (const f of files) {
  if (allow.some((a) => a.test(f))) continue;
  if (!/\.(js|mjs|jsx|json|yaml|yml|env|sh|ps1)$/.test(f)) continue;
  let txt;
  try { txt = fs.readFileSync(f, 'utf8'); } catch { continue; }
  const lines = txt.split('\n');
  lines.forEach((line, i) => {
    if (isPlaceholder(line)) return;
    for (const p of patterns) {
      if (p.test(line)) hits.push(`${f}:${i + 1}: ${line.trim().slice(0, 80)}`);
    }
  });
}
if (hits.length) { console.error('FAIL: possible secrets:\n' + hits.join('\n')); process.exit(1); }
console.log(`PASS: secret scan clean across ${files.length} tracked files.`);
