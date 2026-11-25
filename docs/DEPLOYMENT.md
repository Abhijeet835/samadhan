# Deploying Samadhan (beginner guide)

Samadhan is a **college prototype**: simulated money, not an official government
portal. You can deploy it free-tier. **Confirm current free-tier limits on each
provider's pricing page** — they change. Single-instance constraints: the connect
lock and rate limiter are in-memory, so horizontal scaling would need a shared
store (Redis).

Architecture: **API on Render** (Express + MongoDB Atlas), **client on Vercel**
(static React). The OG share page `/i/:id` is served by the **backend**, so
`PUBLIC_SHARE_BASE_URL` = the Render URL, while "Open in Samadhan" links use
`CLIENT_URL` = the Vercel URL.

## 1. MongoDB Atlas
1. Create a free M0 cluster at mongodb.com/atlas.
2. Database Access → add a DB user with a **strong password** (username/password auth).
3. Network Access → allow your host. Render has no fixed egress IP on free tier,
   so you may need `0.0.0.0/0` (allow from anywhere). **Trade-off:** this exposes
   the cluster to the internet; mitigate with a strong password, TLS (default),
   and least-privilege DB user (readWrite on the samadhan DB only). Restrict to
   known IPs if your host offers them.
4. Connect → Drivers → copy the connection string, set the database name to
   `samadhan`: `mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/samadhan?retryWrites=true&w=majority`.
   Transactions (used by payments) require a replica set — Atlas M0 is a replica
   set, so this works.

## 2. Cloudinary (optional photos)
Create a free account → copy Cloud name, API Key, API Secret. Leave empty to run
without uploads (the wizard treats photos as optional).

## 3. Render (API)
1. Push this repo to GitHub. Render → New → Blueprint → select the repo
   (`render.yaml` defines the service).
2. Set the `sync:false` env vars in the dashboard:

   | Variable | Required? | Notes |
   | --- | --- | --- |
   | MONGO_URI | required | Atlas string from step 1 |
   | JWT_SECRET | required | auto-generated (≥32 chars) |
   | CLIENT_URL | required | set after Vercel deploy (step 5) |
   | PUBLIC_SHARE_BASE_URL | required | this Render URL, e.g. https://samadhan-api.onrender.com |
   | ADMIN_EMAIL / ADMIN_PASSWORD | required | strong password ≥12 chars |
   | CRON_SECRET | required for cron | auto-generated |
   | CLOUDINARY_* | optional | empty = no uploads |
   | SMTP_*, N8N_*, GEMINI_*, BUFFER_*, TELEGRAM_* | optional | **keep empty to stay SIMULATED** |

3. Deploy. Read logs: `[server] listening`, `[settings] Default settings ensured`.
4. Health check: `https://<render-url>/api/health` → `{status:"ok", mongo:"connected", version, commit}`.
   Free tier sleeps after inactivity → first request after sleep is slow (cold
   start); the client shows a "Server is waking up…" banner.

## 4. Vercel (client)
1. Vercel → New Project → import the repo, **Root Directory = `client`**.
2. Environment variable: `VITE_API_URL = https://<render-url>/api`.
3. Deploy. `vercel.json` rewrites SPA routes to `/index.html` (assets served normally).

## 5. Wire CORS
Set `CLIENT_URL` on Render to your Vercel URL (e.g. `https://samadhan.vercel.app`)
and redeploy. CORS allows exactly that origin (never `*`).

## 6. Seed from your laptop (point at Atlas)
Seeds refuse production unless `ALLOW_DEMO_SEED=true`. Run locally with MONGO_URI
pointing at Atlas:

**Git Bash**
```bash
cd server
MONGO_URI="mongodb+srv://..." ALLOW_DEMO_SEED=true npm run seed:admin
MONGO_URI="mongodb+srv://..." ALLOW_DEMO_SEED=true npm run seed:authorities
MONGO_URI="mongodb+srv://..." ALLOW_DEMO_SEED=true npm run seed:helpers
MONGO_URI="mongodb+srv://..." ALLOW_DEMO_SEED=true npm run seed:demo
```
**Windows PowerShell**
```powershell
cd server
$env:MONGO_URI="mongodb+srv://..."; $env:ALLOW_DEMO_SEED="true"
npm run seed:admin; npm run seed:authorities; npm run seed:helpers; npm run seed:demo
Remove-Item Env:ALLOW_DEMO_SEED   # remove the override afterwards
```
Then `npm run verify:data` to confirm invariants.

## 7. cron-job.org (free-tier cron)
node-cron stops when the host sleeps. Create three jobs at cron-job.org:
- `POST https://<render-url>/api/internal/jobs/autoclose` header `X-Cron-Secret: <CRON_SECRET>` (hourly)
- `POST https://<render-url>/api/internal/jobs/dispatch-sweep` same header (every 10 min)
- `GET https://<render-url>/api/health` (every 10 min) — keep-warm ping.

## 8. Smoke test
`node server/scripts/smoke.mjs https://<render-url> https://<vercel-url>` — checks
health, envelopes, 404/401, CORS exact origin, security headers, OG tags.

## 9. Release checklist & rollback
- [ ] health connected, smoke PASS, verify:data PASS
- [ ] report → support → tier fires; admin login works; Hindi toggles
- Rollback: Render → Deploys → redeploy a previous deploy; Vercel → Deployments →
  promote a previous deployment.

## Troubleshooting
| Symptom | Fix |
| --- | --- |
| CORS error in browser | CLIENT_URL on Render must exactly equal the Vercel origin |
| 401 loop | JWT_SECRET changed → old tokens invalid; re-login |
| Mongo auth failed | DB user/password wrong, or user lacks readWrite on samadhan |
| Atlas IP blocked | Network Access allow list (0.0.0.0/0 trade-off above) |
| Blank page after deploy | VITE_API_URL wrong / Root Directory not `client` |
| Cold-start timeouts | free tier sleeps; keep-warm ping; client waking banner |
| OG preview not updating | scrapers cache; PUBLIC_SHARE_BASE_URL must be the backend URL |
