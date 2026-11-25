// Deployment smoke test: node scripts/smoke.mjs <apiBaseUrl> <clientUrl>
const [api, client] = process.argv.slice(2);
if (!api || !client) { console.error('Usage: node scripts/smoke.mjs <apiBaseUrl> <clientUrl>'); process.exit(1); }
const base = api.replace(/\/$/, '');
const results = [];
const check = async (name, fn) => {
  try { const ok = await fn(); results.push([name, ok]); }
  catch (e) { results.push([name, false, e.message]); }
};
const j = (r) => r.json();

await check('health 200', async () => (await fetch(`${base}/api/health`)).status === 200);
await check('issues meta envelope', async () => (await j(await fetch(`${base}/api/issues/meta`))).success === true);
await check('helpers meta envelope', async () => (await j(await fetch(`${base}/api/helpers/meta`))).success === true);
await check('unknown api → 404 envelope', async () => {
  const r = await fetch(`${base}/api/definitely-not-a-route`);
  const b = await j(r);
  return r.status === 404 && b.error?.code === 'NOT_FOUND';
});
await check('protected without token → 401', async () => (await fetch(`${base}/api/wallet`)).status === 401);
await check('admin without token → 401', async () => (await fetch(`${base}/api/admin/dashboard`)).status === 401);
await check('CORS preflight exact origin', async () => {
  const r = await fetch(`${base}/api/issues`, { method: 'OPTIONS', headers: { Origin: client, 'Access-Control-Request-Method': 'GET' } });
  const acao = r.headers.get('access-control-allow-origin');
  return acao === client;
});
await check('security headers present', async () => {
  const r = await fetch(`${base}/api/health`);
  return !!r.headers.get('x-content-type-options') || !!r.headers.get('content-security-policy');
});
await check('OG page og:title (if tier-1 issue exists)', async () => {
  const trend = await j(await fetch(`${base}/api/issues/trending?limit=1`));
  const id = trend.data?.issues?.[0]?._id;
  if (!id) return true; // none exists — skip
  const html = await (await fetch(`${base}/i/${id}`)).text();
  return html.includes('og:title');
});

let fail = 0;
for (const [name, ok, err] of results) {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${err ? ' — ' + err : ''}`);
  if (!ok) fail += 1;
}
process.exit(fail ? 1 : 0);
