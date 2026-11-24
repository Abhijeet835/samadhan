# Samadhan — Context & Architecture Contract

> Read this file before changing any code. It is the permanent architectural contract for the project. `docs/PROGRESS.md` records what is already built; this file records what must always remain true.

---

## 1. What Samadhan is

Samadhan is an intermediate-level college prototype — **not a production government service** — that unites two civic-utility experiences in one bilingual, mobile-first web app.

| Mode | Purpose | Core loop |
| --- | --- | --- |
| **Global** | Public civic problems | Report an issue for a simulated ₹5 → neighbours add +1 support for ₹1 → the community fund unlocks a ₹200 Spotlight campaign and a ₹500 formal Escalation |
| **Local** | Verified nearby helpers | Choose a service category → discover admin-verified helpers sorted by distance → tap Connect to reveal Call/WhatsApp → leave a review after a real connection |

A single account system (Citizen / Helper / Admin), a simulated wallet with a full ledger, bilingual UI, notifications and an admin dashboard are shared by both modes.

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

`walletTxns.idempotencyKey` is unique. Repeated requests with the same key must never double-charge. All amounts are signed integers in paise.

---

## 5. Tier engine

Thresholds come from the `settings` collection:

| Mode | Tier 1 — Spotlight | Tier 2 — Escalate |
| --- | --- | --- |
| Normal | ₹200 (`20000` paise) | ₹500 (`50000` paise) |
| Demo | ₹20 (`2000` paise) | ₹50 (`5000` paise) |

After a payment commits, `checkTiers(issueId)` claims each eligible tier atomically:

```js
Issue.findOneAndUpdate(
  { _id: issueId, tiersReached: { $ne: tier } },
  { $addToSet: { tiersReached: tier }, $max: { tier } },
  { new: true }
);
```

Only a non-null result may run tier side effects. Tier actions run after the payment transaction and are failure-isolated: a failed email or webhook must never roll back a payment. Failures are logged and exposed to Admin retry.

**Tier 1:** four bilingual social posts (X ≤ 280 chars including URL, Instagram, Facebook, WhatsApp) with the matched authority handle, notify reporter and supporters, add to Trending, write an audit log, fire the optional n8n/Telegram hook.

**Tier 2:** formal escalation email to the authority (or `SIMULATED` dispatch log when SMTP is empty), stronger social bundle, feature on the landing page, unlock the Next Steps Appeal Card, notify supporters, audit log, optional n8n hook.

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

### Local helpers

- Search only `verificationStatus: 'VERIFIED'`, `isHidden: false`, matching category.
- `$geoNear` radius: 2 / 5 / 10 km, default **5 km**; default sort nearest, optional top-rated.
- Phone numbers never appear in search results. `POST /helpers/:id/connect` logs a connection (max 10/day/user) and only then returns `{ phone, whatsappUrl, safetyNote }`. The seeker's phone is never exposed.
- One review per seeker–helper pair, allowed only after a connection exists. Rating average updates incrementally.
- Three flags from distinct users automatically hide the helper for admin review.

---

## 8. Data model — 15 planned collections

| Collection | Purpose | Key indexes |
| --- | --- | --- |
| `users` | Account, roles, language, home location | unique `email` |
| `wallets` | Balance in integer paise | unique `userId` |
| `walletTxns` | Immutable ledger | unique `idempotencyKey`, `(userId, createdAt)` |
| `issues` | Public civic issues | `2dsphere(location)`, `(category, status, createdAt)`, `fundPaise: -1` |
| `issueSupports` | One support per user per issue | unique `(issueId, userId)` |
| `issueUpdates` | Lifecycle timeline | `(issueId, createdAt)` |
| `issueFlags` | Community flags | unique `(issueId, userId)` |
| `authorities` | Department directory | `(cityKeys, categories)` |
| `socialPosts` | Generated campaign bundles | `(issueId, tier)` |
| `dispatchLog` | Email / dispatch previews | `(issueId, sentAt)` |
| `helpers` | Local service providers | `2dsphere(serviceLocation)`, `(verificationStatus, isHidden, categories)` |
| `connections` | Connect-before-contact records | `(seekerId, helperId)`, `(seekerId, createdAt)` |
| `reviews` | Verified ratings | unique `(helperId, seekerId)` |
| `notifications` | In-app notification centre | `(userId, readAt, createdAt)` |
| `settings` / `auditLogs` | Config + immutable admin audit | unique `settings.key`, `auditLogs.createdAt: -1` |

All timestamps are stored in UTC.

---

## 9. API contract

- Base prefix: `/api`
- Success: `{ "success": true, "data": ... }`
- Failure: `{ "success": false, "error": { "code": "MACHINE_CODE", "message": "Human readable message" } }`. Error objects may carry extra detail fields alongside `code`/`message` (e.g. `error.existingIssue` on `DUPLICATE_FOUND`).
- Health: `GET /api/health` is public and must remain available even when MongoDB is not configured.
- Protected routes: JWT auth + role + ownership. Admin routes are strictly `ADMIN`.

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
