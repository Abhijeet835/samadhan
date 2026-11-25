// Every env var read in server/src and client must appear in the matching
// .env.example. Fails otherwise. Placeholders only.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const failures = [];

function walk(d, cb) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const fp = path.join(d, e.name);
    if (e.isDirectory()) { if (e.name !== 'node_modules') walk(fp, cb); }
    else if (/\.(js|mjs)$/.test(e.name)) cb(fp);
  }
}

const serverVars = new Set();
walk(path.join(root, 'src'), (fp) => {
  const txt = fs.readFileSync(fp, 'utf8');
  for (const m of txt.matchAll(/process\.env\.([A-Z0-9_]+)/g)) serverVars.add(m[1]);
});
const serverExample = fs.readFileSync(path.join(root, '.env.example'), 'utf8');
for (const v of serverVars) {
  if (!new RegExp(`^${v}=`, 'm').test(serverExample)) failures.push(`server .env.example missing ${v}`);
}

const clientRoot = path.resolve(root, '../client');
const clientVars = new Set();
walk(path.join(clientRoot, 'src'), (fp) => {
  const txt = fs.readFileSync(fp, 'utf8');
  for (const m of txt.matchAll(/import\.meta\.env\.(VITE_[A-Z0-9_]+)/g)) clientVars.add(m[1]);
});
const clientExamplePath = path.join(clientRoot, '.env.example');
const clientExample = fs.existsSync(clientExamplePath) ? fs.readFileSync(clientExamplePath, 'utf8') : '';
for (const v of clientVars) {
  if (!new RegExp(`^${v}=`, 'm').test(clientExample)) failures.push(`client .env.example missing ${v}`);
}

if (failures.length) { console.error('FAIL:\n' + failures.join('\n')); process.exit(1); }
console.log(`PASS: ${serverVars.size} server + ${clientVars.size} client env vars all present in .env.example.`);
