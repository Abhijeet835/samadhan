# Samadhan — Context & Architecture Contract

> Read this file before changing any code. It is the permanent architectural contract for the project. `docs/PROGRESS.md` records what is already built; this file records what must always remain true.

---

## 1. What Samadhan is

Samadhan is an intermediate-level college prototype — **not a production government service** — that unites two civic-utility experiences in one bilingual, mobile-first web app.

| Mode | Purpose | Core loop |
| --- | --- | --- |
| **Global** | Public civic & social problems | Report a **Social Explosion** or **Pool Funds** issue across India (State/UT → City/Area) with dynamic **SMALL / MEDIUM / LARGE** thresholds → citizens support or pool funds atomically → threshold triggers public social campaigns (Instagram/X + shareable page) or community-funded resolution → track **who solved it** (Government / NGO / Private Company + partner recognition) |
| **Local** | Local service marketplace | Service Providers register and list services across 7 categories (Cab & Auto, General Stores, Garage & Mechanics, Sweets & Bakery, Plumbers & Electricians, Appliance Repair, Other Local Services; NO Medical Help) → Consumers discover by category & location and book directly → Providers manage booking lifecycle (`PENDING → ACCEPTED → IN_PROGRESS → COMPLETED`) → simulated wallet settles payment, provider payout & platform commission |

A single account system (`CONSUMER` / `PROVIDER` / `ADMIN`, with legacy `CITIZEN`/`HELPER` automatically mapped), a simulated wallet with a full ledger, bilingual EN/HI UI, notifications and an admin dashboard are shared by both modes.

### Mandatory product disclaimers

- **Not an official government portal.** Samadhan records and amplifies public issues transparently; it never claims government authority or commands officials.
- **Emergency redirection.** A persistent 112 banner belongs on Report and Local screens. Medical help is intentionally excluded as a Local category.
- **Simulated money only.** Every fee, top-up and fund is simulated integer paise. No payment gateway and no real money.
- **Fact-only public posts.** Generated campaigns use facts, photos, location and official department handles only — never personal attacks or individual officer names.

---

## 2. Non-negotiable technical rules

1. **Stack lock.** React 18 (Vite) + Tailwind CSS + shadcn/ui + react-i18next (EN/HI) on the client. Node.js + Express + Mongoose + Zod on the server. MongoDB Atlas with 2dsphere indexes and transactions. Cloudinary, Leaflet/OSM, Nodemailer and node-cron. **No PostgreSQL. No Docker. No Next.js. No Redux. No Material UI.**
2. **Module pattern.** Every backend feature lives in `server/src/modules/<name>/` and separates `routes`, `controller`, `service`, `model` and `schema` (Zod). Controllers only read the request and shape the response; all business logic and database work belongs in services.
3. **Money is integer paise only.** Never floats. ₹5 = `500`, ₹1 = `100`, ₹200 = `20000`, ₹500 = `50000`, ₹50 = `5000`. Format to ₹ only in the UI. All fees and thresholds must be read from the `settings` collection — never hardcoded in business logic.
4. **Atomic payments.** Wallet debit + `walletTxns` row (unique `idempotencyKey`) + issue/support write must execute inside **one MongoDB transaction**. A wallet balance can never go below zero.
5. **Race-safe tiers.** `checkTiers(issueId)` runs **after** the payment transaction commits. Each tier is claimed with an atomic conditional update: `{ _id, tiersReached: { $ne: tier } }` plus `$addToSet`. Only the single winning request runs Tier 1 / Tier 2 side effects.
6. **State machine.** Every issue status change goes through `transitionIssue(issueId, newStatus, actor, note)`. The lifecycle status (`ACTIVE → ACKNOWLEDGED → IN_PROGRESS → RESOLVED → CLOSED`, or `REJECTED`) and the amplification `tier` (0 / 1 / 2) are separate fields.
7. **API envelope.** Every endpoint returns either `{ success: true, data }` or `{ success: false, error: { code, message } }`.
8. **Bilingual by default.** Every user-facing string must use `t('key')` via react-i18next. `client/src/i18n/locales/en.json` and `hi.json` must be updated in the same phase. No untranslated Hindi UI strings at handoff.
9. **Security.** Every protected route verifies JWT authentication, user role **and** resource ownership. Never commit `.env` files or secrets.
10. **No unrequested refactoring.** Work strictly on the current phase. Do not rename or rewrite working files from earlier phases unless fixing a documented bug.

---

## 3. Repository layout

```text
samadhan/
├── AGENTS.md
├── .gitignore
├── README.md
├── docs/
│   ├── CONTEXT.md
│   ├── PROGRESS.md
│   ├── API.md
│   └── DEMO.md                  # Phase 9
├── client/
│   ├── .env.example
│   ├── index.html
│   ├── components.json          # shadcn/ui configuration
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── src/
│       ├── components/          # Shared UI + layout + landing sections
│       ├── pages/               # Route-level pages
│       ├── features/
│       │   ├── global/
│       │   ├── local/
│       │   ├── wallet/
│       │   └── admin/
│       ├── hooks/
│       ├── lib/                 # api.js, utils.js
│       ├── i18n/                # index.js + locales/en.json, hi.json
│       └── context/
└── server/
    ├── .env.example
    └── src/
        ├── config/              # db.js, env.js, cloudinary.js
        ├── middleware/          # auth, role, error, rateLimit, validate
        ├── utils/               # apiResponse.js, audit.util.js, geo.util.js
        ├── jobs/                # node-cron jobs
        ├── seed/                # seed scripts
        └── modules/             # one folder per feature
```

---

## 4. Money, wallet and payment rules

| Action | Default cost | Atomic behaviour |
| --- | --- | --- |
| New user signup | +₹50 (`5000` paise) | Create user + wallet + `SIGNUP_CREDIT` ledger row |
| Simulated top-up | +₹10 / 20 / 50 / 100 | Credit wallet + `TOPUP` row with unique `idempotencyKey` |
| Report a Global issue | −₹5 (`500` paise) | One transaction: check balance → debit → `REPORT_FEE` txn → create issue (`fundPaise: 500`, `supporterCount: 1`) → insert reporter support |
| +1 support an issue | −₹1 (`100` paise) | One transaction: verify user has not supported → check balance → debit → `SUPPORT_FEE` txn → insert support → increment `fundPaise` and `supporterCount` |
| Admin rejects spam | Full refund | Refund every `REPORT_FEE` / `SUPPORT_FEE`, insert `REFUND` txns, set `REJECTED`, zero the fund, take down social posts |
| Admin platform credit (Phase 8B) | +≤₹500 (`platformCreditMaxPaise`) | One transaction: open-status check → `$inc fundPaise + platformCreditPaise` → `PLATFORM_CREDIT` timeline row (unique idempotencyKey) → audit. NO wallet txn, NOT refunded on rejection. After commit `checkTiers`. Invariant: `fundPaise = Σ support amounts + platformCreditPaise` |

`walletTxns.idempotencyKey` is unique. Repeated requests with the same key must never double-charge. All amounts are signed integers in paise.

---

## 5. Dynamic Importance Thresholds & Global Issue Types

Global issues support two distinct modes (`issueType`):
- **`SOCIAL_EXPLOSION`:** Public awareness and collective pressure issues (e.g., broken roads, sewage, public infrastructure, stray animal safety, lack of IITs/AIIMS). Dynamic supporter thresholds depend on `importance` (`SMALL` / `MEDIUM` / `LARGE`) configured in `settings`. Reaching the threshold triggers public explosion campaigns for **X (Twitter)** and **Instagram** (plus shareable OG pages `/i/:id`).
- **`POOL_FUNDS`:** Community-funded resolution issues (e.g., injured stray dog rescue & treatment, road patch repair, local improvement projects). Tracks `fundingGoalPaise`, `fundPaise`, donor contributions, itemized fund utilization (`fundUtilization`), responsible organization/person (`responsibleOrg`), and final resolution.

Location hierarchy: `India → State / Union Territory (all 28 States + 8 UTs) → Area / City`.
Resolution tracking: Every issue tracks `resolution` (`isResolved`, `solverType` = `GOVERNMENT | NGO | PRIVATE_ORG | COMMUNITY`, `organizationName`, `departmentOrLead`, `resolutionDetails`, `impactSummary`, `promotion` for NGOs/private orgs).

After a payment/support commits, `checkTiers(issueId)` (and threshold check) claims threshold unlocks atomically (`{ _id, thresholdReached: { $ne: true } }` / `tiersReached`). Only the single winning request runs side effects (social campaign generation, notifications, audit logs). Side effects are failure-isolated.

---

## 6. Issue lifecycle state machine

`status` and `tier` are separate. Every change goes through `transitionIssue` and inserts an `issueUpdates` timeline row.

| Current | Allowed next | Authorized actor(s) |
| --- | --- | --- |
| `ACTIVE` | `ACKNOWLEDGED`, `IN_PROGRESS`, `RESOLVED`, `REJECTED` | Admin (reporter may set `RESOLVED`) |
| `ACKNOWLEDGED` | `IN_PROGRESS`, `RESOLVED`, `REJECTED` | Admin (reporter may set `RESOLVED`) |
| `IN_PROGRESS` | `RESOLVED`, `REJECTED` | Admin or reporter (`RESOLVED`); admin (`REJECTED`) |
| `RESOLVED` | `CLOSED`, `ACTIVE` (reopen) | Admin or SYSTEM cron after `settings.autoCloseDays` → `CLOSED`; reporter within the same window → `ACTIVE` |
| `CLOSED` / `REJECTED` | None | Locked (terminal) |

`REJECTED` is allowed ONLY from `ACTIVE`, `ACKNOWLEDGED`, `IN_PROGRESS` (admin only). The `SYSTEM` actor (cron) may ONLY do `RESOLVED → CLOSED` after the window; its timeline rows store `actorRole: 'SYSTEM'`, `actorId: null`.

Invalid transitions must throw a structured error, not silently update the document.

---

## 7. Duplicate detection and Local marketplace rules

### Global duplicate detection

Before creating an issue (unless `force === true`), run `$geoNear` on same-category issues that are not `CLOSED` / `REJECTED` and were created in the last 30 days, within **100 metres**. If found, return HTTP 409 with `{ code: 'DUPLICATE_FOUND', existingIssue }`; the UI offers “Support for ₹1” or “This is different”.

### Local service marketplace

- 7 marketplace categories (NO Medical Help): `CAB_AUTO`, `GENERAL_STORE`, `GARAGE_MECHANIC`, `SWEETS_BAKERY`, `PLUMBER_ELECTRICIAN`, `APPLIANCE_REPAIR`, `OTHER_LOCAL` (legacy category keys mapped transparently).
- Providers can register (`VERIFIED` or `PENDING` admin verification), list pricing (`basePricePaise` + `priceHint`), and manage incoming bookings (`PENDING → ACCEPTED → IN_PROGRESS → COMPLETED` or `REJECTED`/`CANCELLED`).
- Consumers can browse all verified providers by category, Indian State/City, or GPS distance, reveal contact on Connect (10/24 h rate-limited), book services directly, track bookings, and review after booking/connection.
- **Platform commission:** On booking completion (`COMPLETED`), an atomic MongoDB transaction charges the consumer wallet (or settles the booking fee), calculates `commissionPaise` using `settings.platformCommissionPercent`, credits the provider wallet (`BOOKING_PAYOUT`), and records the platform commission cleanly.
- Free text (displayName, bio, priceHint, review comments) refuses phone-like digit runs and URLs (`CONTACT_IN_TEXT`).
- Public provider location privacy: search and public profile responses round `serviceLocation.coordinates` to 3 decimals (≈110 m) and omit street `address` (city/state/pincode kept). Owner dashboard/PATCH and active bookings keep necessary details.

---

## 8. Data model — 17 collections

| Collection | Purpose | Key indexes |
| --- | --- | --- |
| `users` | Account, roles, language, home location | unique `email` |
| `wallets` | Balance in integer paise | unique `userId` |
| `walletTxns` | Immutable ledger | unique `idempotencyKey`, `(userId, createdAt)`, `(type, createdAt)` |
| `issues` | Public civic issues (+ `platformCreditPaise`) | `2dsphere(location)`, `(category, status, createdAt)`, `fundPaise: -1` |
| `issueSupports` | One support per user per issue | unique `(issueId, userId)` |
| `issueUpdates` | Timeline (kind STATUS/AUTHORITY_ASSIGNED/AUTHORITY_REPLY/PLATFORM_CREDIT) | `(issueId, createdAt)`, unique-sparse `idempotencyKey` |
| `issueFlags` | Community flags (never auto-hide issues) | unique `(issueId, userId)`, `(issueId, dismissed)` |
| `authorities` | Department directory | `(cityKeys, categories)` |
| `socialPosts` | Generated campaign bundles | `(issueId, tier)` |
| `dispatchLog` | Email / dispatch previews | `(issueId, sentAt)` |
| `helpers` | Local service providers | `2dsphere(serviceLocation)`, `(verificationStatus, isHidden, categories)` |
| `connections` | Connect-before-contact records | `(seekerId, helperId)`, `(seekerId, createdAt)` |
| `reviews` | Verified ratings | unique `(helperId, seekerId)` |
| `helperFlags` | Helper flags (3 non-dismissed auto-hide) | unique `(helperId, userId)` |
| `notifications` | In-app notification centre (12 types, PII-free payload) | `(userId, readAt, createdAt)`, unique `(userId, dedupeKey)` partial, TTL 90 d |
| `settings` / `auditLogs` | Config + immutable admin audit (entity/entityId/before/after) | unique `settings.key`, `auditLogs.createdAt:-1`, `(action,createdAt)`, `(entity,entityId,createdAt)` |

All timestamps are stored in UTC.

---

## 9. API contract

- Base prefix: `/api`
- Success: `{ "success": true, "data": ... }`
- Failure: `{ "success": false, "error": { "code": "MACHINE_CODE", "message": "Human readable message" } }`. Error objects may carry extra detail fields alongside `code`/`message` (e.g. `error.existingIssue` on `DUPLICATE_FOUND`).
- Health: `GET /api/health` is public and must remain available even when MongoDB is not configured. Returns `{ status, db, mongo, uptimeSec, version, commit, timestamp }` (no secrets).
- Internal jobs (Phase 9B): `POST /api/internal/jobs/:job` (autoclose | dispatch-sweep) for external cron on sleeping hosts; 404 when `CRON_SECRET` unset, else constant-time `X-Cron-Secret` check; runs the same idempotent functions as node-cron.
- Protected routes: JWT auth + role + ownership. Admin routes are strictly `ADMIN`.
- Admin surface (Phase 8B): `/api/admin/{issues,users,settings,categories,dashboard,audit}` plus the earlier `authorities`, `dispatch`, `social`, `helpers`, `issues/:id/recheck-tiers`. Every admin mutation writes an immutable, PII-free audit row; audit rows are never updated or deleted.

`docs/API.md` is the live endpoint reference.

---

## 10. Bilingual contract

- Libraries: `i18next` + `react-i18next`.
- Locale files: `client/src/i18n/locales/en.json` and `hi.json`.
- Every user-visible label, message, empty state, validation message and toast uses `t('key')`.
- Add both translations in the same phase; never ship a key only in English.
- Fonts: **Inter** for Latin and **Noto Sans Devanagari** for Hindi, loaded in `client/index.html`.
- Persist the chosen language in `localStorage`; keep `<html lang>` in sync.
- Store all dates in UTC and format them in the UI.

---

## 11. Environment variables

### Server (`server/.env`)

| Name | Purpose |
| --- | --- |
| `PORT` | API port, default `5000` |
| `MONGO_URI` | MongoDB Atlas connection string (may be blank in Phase 0) |
| `CLIENT_URL` | CORS origin, default `http://localhost:5173` |
| `JWT_SECRET` | Phase 1 |
| `CLOUDINARY_*` | Phase 3 |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` | Phase 5 email dispatch; `SMTP_HOST` empty → SIMULATED previews |
| `DISPATCH_OVERRIDE_TO` | Phase 5: redirect real sends to a safe test inbox |
| `N8N_WEBHOOK_URL` | Optional Phase 5 hook |
| `N8N_WEBHOOK_SECRET` | Optional Phase 5 hook secret (`X-Samadhan-Secret` header) |
| `ENABLE_CRON` | Phase 5: `false` disables scheduled jobs |
| `NODE_ENV` | Phase 9B: `production` triggers boot-time env validation + seed guards |
| `CRON_SECRET` | Phase 9B: guards `POST /api/internal/jobs/:job` (empty = disabled) |
| `ALLOW_DEMO_SEED` | Phase 9B: `true` permits demo/sample seeds in production (remove after) |
| `RENDER_GIT_COMMIT` | Phase 9B: surfaced in `/api/health` (set by host) |
| `PUBLIC_SHARE_BASE_URL` | Phase 6: base URL for OG share pages (e.g. `http://localhost:5000`) |
| `DEFAULT_SOCIAL_IMAGE_URL` | Phase 6: fallback image for social posts |
| `GEMINI_API_KEY` | Phase 6: Google Gemini AI API key for social copywriting |
| `GEMINI_MODEL` | Phase 6: Gemini model name (default `gemini-3.5-flash-lite`) |
| `BUFFER_API_KEY` | Phase 6: Buffer GraphQL API key for X/Facebook/Instagram |
| `BUFFER_CHANNEL_X`, `BUFFER_CHANNEL_FB`, `BUFFER_CHANNEL_IG` | Phase 6: Buffer channel IDs for each platform |
| `BUFFER_POST_MODE` | Phase 6: `shareNow` or `addToQueue` |
| `TELEGRAM_BOT_TOKEN` | Phase 6: Telegram Bot API token |
| `TELEGRAM_CHAT_ID` | Phase 6: Telegram channel/chat ID (e.g. `@samadhan_issues`) |
| `REDDIT_SUBREDDIT` | Phase 6: Reddit subreddit name (without r/) |
| `UPLOAD_POST_API_KEY` | Phase 6: upload.post API key for Reddit (primary) |
| `UPLOAD_POST_USER` | Phase 6: upload.post username |
| `REDDIT_CLIENT_ID`, `REDDIT_CLIENT_SECRET`, `REDDIT_REFRESH_TOKEN`, `REDDIT_USER_AGENT` | Phase 6: Reddit OAuth credentials (fallback) |

### Client (`client/.env`)

| Name | Purpose |
| --- | --- |
| `VITE_API_URL` | API base URL, default `http://localhost:5000/api` |

Never commit real secrets. `.env.example` files are the only environment files in Git.

---

## 12. Build roadmap

| Phase | Scope |
| --- | --- |
| **0** | Foundation: folders, docs, Express health API, React/Vite/Tailwind/shadcn shell, bilingual landing page, layout |
| 1 | Auth, roles, profile, Global/Local mode switch, admin seed |
| 2 | Simulated wallet, settings, atomic ledger |
| 3 | Global report wizard, feed, detail, lifecycle |
| 4 | 100 m duplicate detection, paid +1 support, live fund meter |
| 5 | Race-safe tier engine, authorities, lifecycle cron, email dispatch |
| 6 | Social bundles, share cards, public OG page, trending |
| 7 | Local verified helpers, connect, reviews, dashboard |
| 8 | Maps, notifications, full admin panel |
| 9 | Hindi polish, PWA, rich seed, tests, deployment, demo script |

Only build the phase the user requests. Update `docs/PROGRESS.md` and `docs/API.md` at the end of every phase, verify both dev servers, then hand over manual test steps before committing.
