# Samadhan — Build Progress Log

> This file records what has been built. Update it at the end of every phase. `docs/CONTEXT.md` records what must remain true.

---

## Current Status (read this first)

|Item|Value|
|---|---|
|**Phases complete**|0, 1, 2, 3, 4, 5, 6|
|**Next phase**|7 — Local verified helpers, connect, reviews & dashboard|
|**Server tests**|95/95 passing (`cd server && npm test`: 15 wallet + 14 issues + 24 support/duplicate + 25 tiers/dispatch/cron + 17 social)|
|**i18n parity**|`en.json` / `hi.json` 444/444 keys|
|**Dev servers**|API `http://localhost:5000/api/health` · Client `http://localhost:5173`|
|**Seed admin (local dev only)**|`admin@samadhan.local` / `Admin@12345` (from `npm run seed:admin`)|
|**Git**|Phases 0–6 committed on `main`|

**If you are a new AI session resuming this project:** read `AGENTS.md` → `docs/CONTEXT.md` → this file → `docs/API.md`. Build only the next phase. Do not refactor earlier phases except to fix a documented bug.

**Mid-phase handoff line (use when a session is cut off):** `Phase N IN PROGRESS — done: … | not done: … | files touched: …`

---

## Phase 0: Foundation ✅

**Completed:** 2026-11-24

### Backend

- [x] Express API skeleton with health endpoint (`GET /api/health`)
- [x] MongoDB connection setup with Atlas URI support
- [x] Environment configuration (`server/.env.example` + `.env`)
- [x] CORS, helmet, error middleware
- [x] Module pattern folder structure under `server/src/modules/`
- [x] Modular config (`config/env.js`, `config/db.js`)
- [x] Standard API envelope: `{ success, data }` / `{ success, error: { code, message } }`

### Frontend

- [x] React 18 + Vite project initialized
- [x] Tailwind CSS + shadcn/ui configured (`components.json`)
- [x] react-i18next with English and Hindi locales (`i18n/locales/en.json`, `hi.json`)
- [x] Landing page with Hero, Modes Preview, How It Works, Trust Section
- [x] Language toggle in header
- [x] Responsive layout with SiteLayout, Header, Footer
- [x] Feature folder structure: `features/global`, `features/local`, `features/wallet`, `features/admin`

### Documentation

- [x] `README.md` — project overview and setup instructions
- [x] `AGENTS.md` — mandatory rules for AI coding sessions
- [x] `docs/CONTEXT.md` — permanent architectural contract
- [x] `docs/API.md` — health endpoint documented
- [x] `docs/PROGRESS.md` — this file

### DevOps

- [x] `.gitignore` — excludes `node_modules`, `.env`, build artifacts
- [x] Both servers boot cleanly:
    - Backend: `http://localhost:5000/api/health` → `{ "db": "connected" }`
    - Frontend: `http://localhost:5173` → landing page loads

### Manual Test Checklist (Phase 0)

1. ✓ Run `cd server && npm install && npm run dev` → server starts on port 5000
2. ✓ Visit `http://localhost:5000/api/health` → returns JSON with `db: "connected"`
3. ✓ Run `cd client && npm install && npm run dev` → Vite dev server starts on port 5173
4. ✓ Visit `http://localhost:5173` → landing page loads with bilingual toggle
5. ✓ Click language toggle (EN/HI) → all text switches language
6. ✓ Check responsive layout on mobile viewport

---

## Phase 1: Auth, Roles & Profile ✅

**Completed:** 2026-11-24

### Backend

- [x] User model with roles (CITIZEN, HELPER, ADMIN) and 2dsphere index on homeLocation
- [x] JWT authentication utilities (`jwt.util.js`)
- [x] Auth middleware (`authenticate`, `optionalAuth`)
- [x] Role middleware (`authorize`, `requireAdmin`, `requireHelper`, `checkOwnership`)
- [x] Zod validation schemas for auth endpoints
- [x] User service with bcrypt password hashing
- [x] Auth endpoints:
    - `POST /api/auth/register` — Register new user
    - `POST /api/auth/login` — Login with email/password
    - `POST /api/auth/refresh` — Refresh access token
    - `GET /api/auth/me` — Get current user profile
    - `PATCH /api/auth/profile` — Update profile
    - `POST /api/auth/change-password` — Change password
    - `POST /api/auth/switch-mode` — Switch between GLOBAL/LOCAL modes
- [x] Admin seed script (`npm run seed:admin`)
- [x] Environment config updated with JWT secrets and admin credentials

### Frontend

- [x] AuthContext with register, login, logout, updateProfile, switchMode, changePassword
- [x] API interceptor to automatically include JWT Bearer token
- [x] Login page (`/login`)
- [x] Register page (`/register`)
- [x] Profile page (`/profile`) with tabs for profile editing and password change
- [x] Navbar updated with auth links (Login/Register or Profile)
- [x] Protected route handling

### i18n Translations

- [x] English translations for auth UI (`auth`, `profile` keys in `en.json`)
- [x] Hindi translations for auth UI (`auth`, `profile` keys in `hi.json`)

### Documentation

- [x] Updated `docs/API.md` with all auth endpoints
- [x] Updated `docs/PROGRESS.md` with Phase 1 completion
- [x] Updated error codes in `docs/API.md`

### Manual Test Checklist (Phase 1)

1. ✓ Run `npm run seed:admin` → Admin user created with credentials from `.env`
2. ✓ Register new user at `/register` → Account created, auto-logged in
3. ✓ Login at `/login` with admin credentials → Success, redirected to home
4. ✓ Visit `/profile` → Profile page loads with user data
5. ✓ Update name and phone in profile → Changes saved
6. ✓ Change password → Password updated, can login with new password
7. ✓ Switch language in profile → UI updates immediately
8. ✓ Logout → Redirected to home, auth state cleared
9. ✓ Try accessing `/profile` without login → was accessible in Phase 1; **fixed in Phase 2** (now redirects to `/login` via `ProtectedRoute`)
10. ✓ Test API endpoints with curl/Postman:
    - `POST /api/auth/register` with valid data → 201 with tokens
    - `POST /api/auth/login` with admin credentials → 200 with tokens
    - `GET /api/auth/me` with Bearer token → 200 with user data
    - `PATCH /api/auth/profile` with Bearer token → 200 with updated user
    - `POST /api/auth/switch-mode` with Bearer token → 200 with updated mode

---

## Phase 2: Simulated Wallet, Settings & Atomic Ledger ✅

**Completed:** 2026-11-24

### Backend

- [x] Wallet module `server/src/modules/wallet/` with strict separation: `settings.model.js`, `wallet.model.js`, `walletTxn.model.js`, `wallet.schema.js` (Zod), `wallet.service.js`, `wallet.controller.js`, `wallet.routes.js`
- [x] `settings` collection (unique `key`, Mixed `value`) seeded idempotently on startup via `ensureDefaultSettings()` — `$setOnInsert` never overwrites admin-modified values:
    - `reportFeePaise: 500`, `supportFeePaise: 100`, `tier1Paise: 20000`, `tier2Paise: 50000`, `signupCreditPaise: 5000`, `duplicateRadiusM: 100`, `duplicateDays: 30`, `demoMode: false`
    - `getEffectiveTierThresholds()` returns ₹20/₹50 thresholds when `demoMode: true` (for Phase 5)
- [x] `wallets` collection: unique `userId` ref User, integer `balancePaise` (min 0), timestamps
- [x] `walletTxns` immutable ledger: indexed `userId`, enum `type` (TOPUP / REPORT_FEE / SUPPORT_FEE / REFUND / PLATFORM_CREDIT / SIGNUP_CREDIT), signed integer `amountPaise`, optional `issueId`, **unique `idempotencyKey`**, `(userId, createdAt)` index
- [x] Atomic `chargeWallet({ userId, type, amountPaise, issueId, idempotencyKey, session })`:
    - Runs in one MongoDB transaction (`session.withTransaction`); accepts a caller session for Phase 3/4 flows
    - Debits use a conditional update (`balancePaise: { $gte: debit }`) — balance can never go below 0; throws `409 INSUFFICIENT_BALANCE`
    - Unique `idempotencyKey` + duplicate-key race fallback — retries/double-taps never double-charge
- [x] Signup hook in `user.service.js registerUser`: new users get a wallet + `SIGNUP_CREDIT` (₹50 from settings); legacy/seeded users get one lazily on `GET /api/wallet` (exactly once, key `SIGNUP_CREDIT:<userId>`)
- [x] Endpoints (JWT-protected, standard envelope):
    - `GET /api/wallet` — balance in paise + top-up packs
    - `POST /api/wallet/topup` — packs 1000/2000/5000/10000 paise + `idempotencyKey`, atomic credit + `TOPUP` row (201 first time, 200 idempotent replay)
    - `GET /api/wallet/txns` — paginated, newest-first, user-scoped history

### Frontend

- [x] `ProtectedRoute` component (loading skeleton, redirect to `/login` with return path); `/wallet` and `/profile` now protected; login returns to the original page
- [x] Wallet feature `client/src/features/wallet/`: `useWallet` hook, `BalanceCard`, `TopupPacks`, `TransactionList`, `money.js` (paise → ₹ display via Intl, EN-IN/HI-IN)
- [x] `/wallet` page (`pages/WalletPage.jsx`): balance card, ₹10/₹20/₹50/₹100 simulated top-up buttons (disabled while pending, per-click UUID idempotency key), transaction history with pagination
- [x] Loading skeletons, empty state, inline error + retry, `react-hot-toast` feedback
- [x] Wallet link in Navbar and BottomNav (authenticated only)

### i18n Translations

- [x] `wallet.*` + `nav.wallet` keys added to BOTH `en.json` and `hi.json` (key parity verified)

### Tests

- [x] Vitest + Supertest + mongodb-memory-server (replica set for real transactions); `npm test` in `server/`
- [x] 15 tests passing, including:
    - Repeated top-up/debit with same `idempotencyKey` never double-charges (sequential AND concurrent double-tap)
    - Balance never below zero: insufficient debit leaves no trace; 20 concurrent ₹5 debits on ₹50 → exactly 10 succeed, balance 0
    - Fees/thresholds read from `settings` (changed `signupCreditPaise` → new wallet credits the new value; defaults idempotent; demoMode thresholds)
    - Signup credit on registration, lazy wallet for legacy users, auth rejection, pack validation, pagination

### Documentation

- [x] Updated `docs/API.md` with wallet endpoints, settings table and new error codes
- [x] Updated `docs/PROGRESS.md` (this block)

### Verification

- [x] Server (5000) and client (5173) boot cleanly; client production build passes
- [x] Browser-tested: protected redirect, admin lazy ₹50 credit, ₹10 top-up → ₹60 + toast + ledger row, fresh registration → ₹50 signup bonus, full Hindi wallet UI

### Manual Test Checklist (Phase 2)

1. Start both servers (`server: npm run dev`, `client: npm run dev`) → no errors; server logs `[settings] Default settings ensured.`
2. Visit `http://localhost:5173/wallet` logged out → redirected to `/login`
3. Login (e.g. admin@samadhan.local / Admin@12345) → returned to `/wallet`, balance ₹50 (legacy signup credit), history shows "Signup bonus +₹50"
4. Click ₹10 pack → toast "₹10 added to your wallet", balance ₹60, new "Top-up +₹10" row on top
5. Click ₹100 pack → balance ₹160; buttons disabled while a top-up is in flight
6. Register a brand-new user → `/wallet` shows ₹50 with a single Signup bonus row
7. Toggle हिंदी → every wallet string (balance, packs, history, dates) renders in Hindi
8. Reload the page → balance and history persist; no duplicate signup credit
9. `cd server && npm test` → 15/15 tests pass
10. API: `POST /api/wallet/topup` twice with the same `idempotencyKey` → second response `idempotent: true`, balance unchanged; `GET /api/wallet` without token → 401

---

## Phase 3: Global Report, Feed, Detail & Lifecycle ✅

**Completed:** 2026-11-24

### Backend

- [x] Issues module `server/src/modules/issues/` with strict separation: `issue.model.js`, `issueSupport.model.js`, `issueUpdate.model.js`, `issue.schema.js` (Zod), `issue.service.js`, `issue.controller.js`, `issue.routes.js`
- [x] `issues` collection with **2dsphere index** on `location`, plus `(category, status, createdAt)`, `(fundPaise)` and text index on `(title, description)`; enums: 8 categories, 6 statuses; `tier` (0/1/2) + `tiersReached` fields ready for Phase 5; `fundPaise`/`supporterCount`/`viewsCount` counters
- [x] `issueSupports` (unique `(issueId, userId)`, `isReporter` flag) and `issueUpdates` timeline (fromStatus/toStatus/actor/note)
- [x] Atomic paid report `createIssue()`: fee read from `settings.reportFeePaise`; one transaction creates the issue (status ACTIVE, fund = fee, 1 supporter) + `chargeWallet` REPORT_FEE debit + reporter support row + timeline row; unique `idempotencyKey` with duplicate-key race fallback (replay → 201 first, 200 + `idempotent: true` after); insufficient balance → 409 and **nothing** is created
- [x] `transitionIssue()` — the only path to change status; conditional update on current status (race-safe); admin-only ACKNOWLEDGED/IN_PROGRESS/REJECTED/CLOSED; RESOLVED by admin or reporter; reporter reopen within 7 days of `resolvedAt` only; REJECTED refunds every contribution atomically (REFUND row per support, key `REFUND:<supportId>`) and zeroes the fund
- [x] Endpoints: `GET /api/issues/meta` (public), `GET /api/issues` (public feed: filters category/status/q, sort latest|fund|supporters, pagination, REJECTED hidden), `POST /api/issues` (protected), `GET /api/issues/:issueId` (public + optionalAuth viewer context; REJECTED visible only to reporter/admin), `POST /api/issues/:issueId/transition` (protected)
- [x] Cloudinary config (`config/cloudinary.js`) + uploads module: `POST /api/uploads/image` (multer memory, JPEG/PNG/WebP ≤5 MB, folder `samadhan/issues`); graceful `503 CLOUDINARY_NOT_CONFIGURED` when env vars absent; `.env.example` updated

### Frontend

- [x] Global feature `client/src/features/global/`: constants, `StatusBadge`/`CategoryBadge`, `IssueCard`, `IssueFilters` (search + category/status/sort), `Timeline`, `TransitionPanel` (role-aware allowed transitions via `nextStatusesFor`), `useIssuesFeed` (debounced search), `useIssueDetail`, `uploadPhoto`
- [x] `/report` 4-step wizard (`pages/ReportPage.jsx`, protected): details → location (geolocation button or manual coords + address) → photos (optional, handles 503 gracefully) → confirm & pay (fee/balance/balance-after from live wallet data, simulated-money disclaimer, INSUFFICIENT_BALANCE inline error + wallet link); one idempotencyKey per wizard session reused across retries
- [x] `/issues` feed page (cards, skeletons, empty state, pagination) and `/issues/:issueId` detail page (badges, photos, location, timeline, fund card, transition panel for admin/reporter) — both public routes
- [x] Navbar (desktop) + BottomNav (mobile) now include Feed and Report links

### i18n Translations

- [x] `nav.feed`, `nav.report`, full `issues.*` and `report.*` blocks added to BOTH `en.json` and `hi.json` (282/282 key parity verified by script)

### Tests

- [x] 14 new tests in `server/src/modules/issues/issues.test.js` (29/29 total passing), covering: atomic report (balance debit + fund + supporter + timeline + txn with issueId), settings-driven fee change, insufficient balance leaves no trace, idempotent replay, auth/validation rejection, feed filters/sort/pagination/REJECTED-hidden, meta endpoint, detail viewer contexts + 404 + bad id, full admin chain with 5 timeline rows, invalid transitions + terminal REJECTED, reporter permissions, reopen within/after 7 days + admin reopen forbidden, HTTP transition auth, rejection refunds all contributions with no double-refund

### Documentation

- [x] Updated `docs/API.md` with issues + uploads endpoints, state machine rules and new error codes
- [x] Updated `docs/PROGRESS.md` (this block)

### Verification

- [x] Server (5000) and client (5173) boot cleanly; client production build passes (`vite build`, 2.24s)
- [x] Browser-tested full flow: empty feed → report wizard (₹50 balance, −₹5 fee preview) → published issue detail (ACTIVE, timeline, fund ₹5, 1 supporter, reporter actions) → feed card; live API check: admin ACKNOWLEDGED + IN_PROGRESS succeeded, IN_PROGRESS→CLOSED rejected with `INVALID_TRANSITION`

### Manual Test Checklist (Phase 3)

1. Start both servers → visit `http://localhost:5173/issues` logged out → feed loads (public), empty state if no issues
2. Visit `/report` logged out → redirected to `/login`; login → returned to the wizard
3. Fill details (title ≥5, description ≥20, category) → Next → set location (button or manual coords) → Next → skip photos → confirm shows fee ₹5, your balance, balance-after
4. "Pay & publish" → redirected to the issue detail page: ACTIVE badge, timeline "Issue reported", community fund ₹5, 1 supporter; wallet history shows "Report fee −₹5"
5. As reporter, transition panel offers only "Resolved"; as a different citizen, no panel; as admin (admin@samadhan.local / Admin@12345), Acknowledged/In progress/Rejected available
6. Admin: ACTIVE → ACKNOWLEDGED → IN_PROGRESS → RESOLVED → CLOSED, each adding a timeline row; try IN_PROGRESS → CLOSED directly → error "not allowed"
7. Reporter reopens a RESOLVED issue within 7 days → back to ACTIVE
8. Admin rejects an issue → every supporter is refunded (wallet history "Refund"), fund shows ₹0, issue disappears from the public feed but stays visible to its reporter
9. Report with balance < ₹5 → inline "Insufficient balance" error + wallet link; nothing is created
10. Toggle हिंदी → feed, wizard, detail, statuses and categories all render in Hindi
11. `cd server && npm test` → 29/29 tests pass
12. Without Cloudinary env vars, adding a photo shows "uploads not configured" and the wizard lets you continue

### Known Gaps & Open Decisions (Phase 3)

- ~~**Not built:** `GET /api/issues/mine` and a "My Reports" page.~~ Closed in Phase 4: `/mine`, `/mine/supported` and the `/my-activity` page.
- **Lifecycle vs CONTEXT.md §6:** the implementation lets an admin `REJECT` from any non-terminal status, while §6 lists `REJECTED` only from `ACTIVE`. Decide one way and update the other (CONTEXT.md or `transitionIssue`) before Phase 5.
- **Manual `CLOSED`:** admins close resolved issues by hand until the Phase 5 cron (auto-close after 7 days).
- **Rejection refunds** are done; taking down social posts on rejection arrives with Phase 6.
- **Location input** is now address-first: "Use my location" reverse-geocodes via OSM Nominatim and autofills address/city/state/pincode; typed addresses are forward-geocoded on Next. No manual lat/lng fields. Map picker arrives in Phase 8.
- **Photos** are optional; without `CLOUDINARY_*` env vars the API returns `503 CLOUDINARY_NOT_CONFIGURED` and the wizard continues.
- **Tiers:** `tier` / `tiersReached` fields exist but nothing writes them until Phase 5.

---

## Phase 4: Support & Duplicate Detection ✅

**Completed:** 2026-11-24

### Backend

- [x] `findDuplicate({ category, coordinates })` in `issue.service.js`: `$geoNear` first stage (spherical, key `location`, `distanceField: 'distanceM'`), `maxDistance = settings.duplicateRadiusM`, query = same category + status `$nin [CLOSED, REJECTED]` + `createdAt >= now − settings.duplicateDays`; both values read from settings
- [x] Wired into `POST /api/issues` with optional `force` boolean (Zod). Order: idempotent replay FIRST (a retry is never blocked by its own issue) → duplicate check (skipped when `force === true`) → existing atomic transaction unchanged
- [x] `409 DUPLICATE_FOUND` carries `error.existingIssue` = { _id, title, category, status, fundPaise, supporterCount, photos (first only), distanceM (rounded), createdAt, hasSupported, isReporter, canSupport }. Nothing charged or written. `ApiError` gained an optional `details` argument; the envelope stays `{ success:false, error:{ code, message, …details } }` (backward compatible)
- [x] `supportIssue({ issueId, userId, idempotencyKey })` + `POST /api/issues/:issueId/support`: supportable statuses ACTIVE/ACKNOWLEDGED/IN_PROGRESS only (`409 ISSUE_NOT_SUPPORTABLE`); one support per user (`409 ALREADY_SUPPORTED`, reporter included); fee from `settings.supportFeePaise`; ONE transaction via caller-session `chargeWallet` → SUPPORT_FEE txn (issueId set) → IssueSupport row storing `amountPaise` (rejection refunds stay exact) → conditional `$inc { fundPaise, supporterCount }` guarded by current status
- [x] Idempotent replay → 200 `idempotent:true`; key belonging to another user/issue → `409 IDEMPOTENCY_KEY_CONFLICT`; duplicate-key race on `(issueId, userId)` rolls back the debit and maps to ALREADY_SUPPORTED; same-key race returns the winner's result (also on transaction retry)
- [x] Response 201: `{ support, issue:{ fundPaise, supporterCount }, wallet:{ balancePaise }, idempotent }`. After commit only the comment `// Phase 5: checkTiers(issueId) is called here` — no tier side effects
- [x] Read endpoints (registered BEFORE `/:issueId`; route-order test added): `/meta` now also returns `supportFeePaise` + `thresholds` via `getEffectiveTierThresholds()` (demoMode-aware); detail `viewer.canSupport`; `GET /:issueId/supporters` (public, paginated, "FirstName L." only, REJECTED visibility = detail rule); `GET /mine` (protected, includes REJECTED); `GET /mine/supported` (protected, { issue, amountPaise, supportedAt, isReporter })

### Frontend

- [x] `FundMeter` (full + compact): gradient progress toward Tier 1/Tier 2 from `/meta`, threshold markers, "₹X of ₹Y to Spotlight", "threshold reached" states only — no campaign claims; compact fund bar added to `IssueCard`
- [x] Live updates: `useIssueDetail` polls every 10 s, pauses when `document.visibilityState === 'hidden'`, refreshes on visibility regain, cleans up on unmount; silent polls keep last good data on error
- [x] `SupportPanel`: fee/balance/balance-after dialog, ONE idempotencyKey per dialog session reused across retries, disabled while pending, instant meter + balance update from response + toast; states: logged out → "Login to support" (returns to the issue after login), reporter → "You reported this", supported → "You supported ✓", unsupportable → short reason, insufficient → inline + wallet link; sticky bottom action bar on mobile
- [x] `DuplicateDialog` in the report wizard confirm step: shows existing issue (title/category/status/distance/fund/supporters); "Support for ₹1" only when `canSupport` (hidden for reporter/supporter) → supports then navigates; "This is different" → resubmits with `force:true` and the SAME idempotencyKey; "View issue" / "Cancel"
- [x] `SupportersList` on the detail page with "Load more"; `/my-activity` page (protected) with Reported/Supported tabs, contribution amounts, skeletons/empty/error+retry; nav links in Navbar + BottomNav (authenticated only)
- [x] `support.*`, `duplicate.*`, `meter.*`, `myActivity.*` + `nav.myActivity`, `common.close/retry/loadMore` added to BOTH locales — parity 325/325

### Tests

- [x] 24 new tests in `support.test.js` (53/53 total): duplicate radius/category/CLOSED/REJECTED/age/force/replay-not-self-blocked/settings-radius; support happy path, settings fee, insufficient-no-trace, already-supported (reporter + supporter), unsupportable, replay, key conflict, concurrent same-key AND different-key double-taps (exactly one charge), 10 concurrent supporters (fund = 500 + 10×100, count 11, 10 txns), rejection refunds everyone; route order, privacy (no email/phone), scoping, 401s, `viewer.canSupport`; ledger invariant sum(txns) === balance for every user
- [x] Existing `issues.test.js` helper now jitters coordinates so unrelated tests never trigger duplicate detection

### Verification

- [x] Client production build passes; both dev servers running
- [x] Browser-tested with TWO accounts: reporter view (meter, "You reported this", supporters), supporter flow (dialog −₹1, ₹50→₹49, instant ₹5→₹6 meter, "You supported ✓", "Priya S." in list), duplicate dialog (0 m, support option correctly hidden for an existing supporter), "This is different" force-create, My Activity both tabs, full Hindi UI

### Known Gaps & Open Decisions (Phase 4)

- **Duplicate race:** two simultaneous reports at the same spot can both pass the check (accepted limitation, documented in API.md). A unique geo-hash guard would close it but is out of scope.
- **Nominatim:** address geocoding uses the public OSM endpoint (1 req/s policy, no key). Fine for a prototype; a self-hosted/geocoding API key is a production concern.
- **Polling, not push:** 10 s polling is the live-update mechanism; no Socket.IO (not in the stack).
- **Tier side effects:** intentionally absent — `checkTiers` comment marks the Phase 5 hook.
- **Lifecycle vs CONTEXT.md §6** (carried from Phase 3): admin REJECT from any non-terminal status vs §6's ACTIVE-only — still to be reconciled before Phase 5.

### Manual Test Checklist (Phase 4) — needs TWO accounts

1. Start both servers. Account A = any citizen (e.g. `phase2.tester@example.com` / `Test@12345`), account B = a second citizen (e.g. `phase4.supporter@example.com` / `Test@12345`)
2. As A: report an issue (wizard autofills address from "Use my location" or geocodes a typed address). Note the detail page: fund meter ₹5 of ₹200, "You reported this", supporters list shows only you
3. As B (different browser/profile or logout/login): open A's issue → "Support for ₹1" → dialog shows fee −₹1, balance, balance-after → confirm → toast, meter jumps to ₹6 / 2 supporters, "You supported ✓", your "FirstName L." appears in supporters; wallet history shows "Support fee −₹1"
4. As B: click support again → no button (already supported). Via API with a new key → `409 ALREADY_SUPPORTED`, no charge
5. As B: report the SAME category at the SAME address → duplicate dialog shows A's issue with distance ≈ 0 m and NO support option (you already supported) → "This is different" → your issue is created; or "Cancel" → nothing charged
6. As B: report same category ~200 m away → no duplicate dialog, created normally
7. As A: reject your own issue? No — login as admin (`admin@samadhan.local` / `Admin@12345`) → Reject → A and B both refunded (wallet "Refund" rows), fund ₹0, issue hidden from feed but visible to A
8. `/my-activity` as B: Reported tab shows B's issue; Supported tab shows A's issue with "You gave ₹1"
9. Leave the detail page open in two windows; support in one → the other updates within ~10 s; switch tabs → polling pauses
10. Toggle हिंदी → meter, support dialog, duplicate dialog, My Activity all render in Hindi
11. `cd server && npm test` → 53/53; `cd client && npm run build` → clean

---

## Phase 5: Tier Engine & Dispatch ✅

**Completed:** 2026-11-24

### Part 0 — Lifecycle reconcile

- [x] `REJECTED` allowed ONLY from ACTIVE / ACKNOWLEDGED / IN_PROGRESS (admin); RESOLVED→REJECTED now throws `INVALID_TRANSITION` (test added); CONTEXT.md §6 updated
- [x] `SYSTEM` actor: only RESOLVED→CLOSED after the window; timeline row `actorRole: 'SYSTEM'`, `actorId: null` (issueUpdate schema relaxed backward-compatibly); admin manual CLOSED unchanged
- [x] New setting `autoCloseDays` (default 7, `$setOnInsert`); BOTH the reporter reopen window and auto-close read it
- [x] CONTEXT.md §9 notes extra error detail fields; §11 lists the new env vars

### Backend

- [x] Authorities module (`server/src/modules/authorities/`): model (separate multikey indexes on `cityKeys` and `categories` — MongoDB forbids a compound index over two parallel arrays), Zod schemas, `normaliseCity` (trim/lowercase/strip diacritics/collapse spaces), `matchAuthority` with the exact 5-level priority (never throws), admin-only GET/POST/PATCH `/api/admin/authorities` (`404 AUTHORITY_NOT_FOUND`)
- [x] `npm run seed:authorities` — idempotent upserts, 6 CLEARLY SAMPLE rows (3 cities + fallback, example.org emails, header comment, no real officials)
- [x] Tier engine (`server/src/modules/tiers/`): `checkTiers(issueId)` claims tiers 1→2 ascending with ONE conditional update each (threshold + status + `tiersReached` in the filter); returns `{ claimedTiers, done }` — claims awaited, side effects backgrounded; failure-isolated throughout
- [x] Issue model gains `authorityId`, `tier1ReachedAt`, `tier2ReachedAt`; tier 1 claim resolves `matchAuthority` once and sets `authorityId`
- [x] Immutable `auditLogs` written synchronously at claim time (who/what/tier/fund snapshot); dispatch rows INSERTed at claim time with unique `(issueId, tier, channel)`
- [x] Hooks: end of `supportIssue` (response gains `data.tierUnlocked`) AND end of `createIssue` (demo thresholds can be met at report time); Phase 6/8 plug-in points are one-line comments only
- [x] Dispatch module (`server/src/modules/dispatch/`): dispatchLog model (statuses PENDING/SENT/SIMULATED/FAILED/SKIPPED/CANCELLED, indexes per CONTEXT §8), ONE swappable `getTransport()` (10s/15s timeouts), `SMTP_HOST` empty → SIMULATED with full stored preview, `DISPATCH_OVERRIDE_TO` redirect with `[TEST → intended]` subject and intended recipient stored in `to`
- [x] Bilingual facts-only email template (EN block then HI): title/category/address/coords + OSM link/UTC date/supporter count/public URL/≤3 photos; "The Officer-in-charge, <department>"; NOT-official-portal disclaimer; HTML-escaped; NO officer names, reporter PII, money amounts or accusatory language (unit-tested)
- [x] n8n webhook via fetch + AbortController (5s), optional `X-Samadhan-Secret`; empty URL → SKIPPED; failure → FAILED isolated; payload carries no secrets/PII
- [x] Runner rules: non-open issue at execution → CANCELLED (ISSUE_NOT_OPEN); rejection cancels PENDING/FAILED rows inside the existing transaction (refunds untouched); `retryDispatch` conditional FAILED→PENDING with `$inc attempts` (max 5, concurrent retries = one send, SENT/SIMULATED → `409 DISPATCH_NOT_RETRYABLE`); `recheckTiers` admin endpoint
- [x] Admin endpoints: `GET /api/admin/dispatch` (filters status/issueId), `POST /api/admin/dispatch/:logId/retry`, `POST /api/admin/issues/:issueId/recheck-tiers`
- [x] Public-safe detail: `escalation: null | { status, authorityName, sentAt }` — never email/subject/body; feed items include `tier`

### Part D — Cron

- [x] `jobs/index.js` registers after DB connect; skipped when `NODE_ENV=test` or `ENABLE_CRON=false`; logs counts
- [x] `autoCloseJob` hourly (`runAutoCloseOnce`, per-issue error isolation, `npm run job:autoclose`); `dispatchSweepJob` every 10 min re-runs PENDING stuck > 10 min with attempts < 5; FAILED never auto-retried
- [x] npm scripts: `demo:on` / `demo:off` (print effective thresholds), `seed:authorities`, `job:autoclose`

### Frontend

- [x] FundMeter uses REAL `issue.tiersReached` for tier states; "Spotlight unlocked" chip; not-official/112 disclaimer kept visible near the meter
- [x] EscalationCard (tier 2 only): authority name, status-mapped text (SENT/SIMULATED/FAILED+PENDING/SKIPPED/CANCELLED), date, neutral copy — no email address
- [x] SupportPanel: distinct celebratory toasts for tierUnlocked 1/2 + immediate issue refresh
- [x] IssueCard + detail header: TierBadge (Spotlight amber / Escalated violet)
- [x] `/admin/dispatch` (ProtectedRoute gained backward-compatible `roles` prop; admin-only nav link): Dispatch log tab (status filter, cards, preview dialog with subject/body, Retry only for FAILED) + Authorities tab (list, add/edit dialog incl. email/handles/active/fallback); skeletons, empty states, error+retry throughout
- [x] `tier.*`, `escalation.*`, `adminDispatch.*`, `authority.*`, `nav.adminDispatch` in BOTH locales — parity 381/381

### Tests

- [x] 25 new tests in `tiers.test.js` (78/78 total), mocked transport + fetch, mutable env mock: claims/races (20 concurrent checkTiers → one claim + one row set; REJECTED never claims; settings + demoMode thresholds; both tiers in one call; end-to-end 10 concurrent supporters at low thresholds with ledger invariant; tierUnlocked only for the winner), isolation (SMTP throw → payment intact + FAILED row + retry → SENT + retry SENT → 409 + concurrent retries one send; n8n SKIPPED/FAILED), runner rules + sweep, all 5 authority priorities + normalisation + NO_AUTHORITY skip, email rules (disclaimer/URL/bilingual/no PII/no money/HTML escape/SIMULATED preview/override), cron (window, SYSTEM row, concurrent runs one row, SYSTEM restrictions, REJECTED-from-RESOLVED blocked), admin HTTP 401/403/200 matrix, public detail never leaks authority email

### Verification

- [x] `npm test` 78/78; client production build clean; `npm run seed:authorities` idempotent; `demo:on/off` print ₹20/₹50 vs ₹200/₹500
- [x] Browser-verified end-to-end with lowered thresholds: report → support claims tier 1 (`tierUnlocked:[1]`) → support claims tier 2 (`[2]`) → detail shows ESCALATED badge, Spotlight chip, EscalationCard "Escalation prepared (demo mode — email simulated)" with the fallback authority (no WATER dept in Bengaluru — correct priority) → admin dispatch log shows SIMULATED EMAIL + SKIPPED webhooks, preview dialog renders the full bilingual email; Authorities tab lists the 6 seeded rows; thresholds restored afterwards

### Known Gaps & Open Decisions (Phase 5)

- **Authority index:** CONTEXT.md §8 lists `(cityKeys, categories)` together; MongoDB cannot compound-index two parallel arrays, so each field has its own multikey index.
- **demoMode off later:** tiers already claimed stay claimed (accepted, documented in API.md).
- **Simultaneous duplicate reports** can still both pass (Phase 4 accepted limitation, unchanged).
- **Sample authorities only** — example.org emails; replace with verified official contacts before any real dispatch. `DISPATCH_OVERRIDE_TO` is the safe way to test real SMTP.
- **Social posts / trending / notifications / maps / full admin panel** are NOT built — one-line Phase 6/8 comments mark the plug-in points; `/admin/dispatch` is intentionally minimal until Phase 8.
- **Stale dev index:** databases created before this phase may hold the old `cityKeys_1_categories_1` index; drop it once (Mongoose will not remove it automatically).

### Manual Test Checklist (Phase 5) — TWO citizens + admin

1. `cd server && npm run seed:authorities` then `npm run demo:on` (prints Tier 1 = 2000 / Tier 2 = 5000 paise = ₹20/₹50). Start both servers
2. Citizen A reports an issue in a seeded city/category (e.g. ROAD in Bengaluru) → fund ₹5
3. Citizens B + A's other accounts support (₹1 each). At fund ≥ ₹20 the winning supporter sees the "Spotlight unlocked!" toast; the detail page shows the amber Spotlight chip + ESCALATED-ready meter
4. Keep supporting to fund ≥ ₹50 → "Escalation triggered!" toast; EscalationCard appears: authority name + "Escalation prepared (demo mode — email simulated)" (SMTP empty). No email address anywhere public
5. Login as admin → nav "Dispatch" → `/admin/dispatch`: EMAIL row SIMULATED with Preview showing the full bilingual email (disclaimer, OSM link, no money/PII); webhook rows SKIPPED. Authorities tab: edit an email/handles/active, add a new authority
6. Real-SMTP test (optional): set `SMTP_HOST` etc. + `DISPATCH_OVERRIDE_TO=your@inbox` in `.env`, restart, admin Retry a FAILED row or recheck tiers → email arrives at YOUR address, subject prefixed `[TEST → intended]`
7. Admin rejects a tier-2 issue → refunds as before, dispatch rows CANCELLED, EscalationCard shows cancelled
8. Resolve an issue, backdate `resolvedAt` > 7 days (or lower `autoCloseDays`), `npm run job:autoclose` → CLOSED with a SYSTEM timeline row; a 6-day-old resolved issue stays open
9. `npm run demo:off` → thresholds back to ₹200/₹500; already-claimed tiers stay claimed
10. Toggle हिंदी → tier chips, escalation card, admin page all translate; `npm test` → 78/78

---

## Phase 6: Social Bundles & Trending ✅

**Completed:** 2026-11-25

### Backend

- [x] Social module `server/src/modules/social/`: `socialPost.model.js` (6 platforms: `X`, `INSTAGRAM`, `FACEBOOK`, `REDDIT`, `WHATSAPP`, `TELEGRAM`; statuses `GENERATED | POSTING | POSTED | SIMULATED | FAILED | TAKEN_DOWN`; unique `(issueId, tier, platform)`), `social.schema.js` (Zod), `social.service.js`, `social.controller.js`, `social.routes.js`, `og.controller.js`, `sanitize.js`, `copywriter.js`, `templates.js`
- [x] Platform publishers in `server/src/modules/social/publishers/`: `buffer.publisher.js` (X/FB/IG via GraphQL), `telegram.publisher.js` (Bot API `sendPhoto`/`sendMessage` + `deleteMessage`), `reddit.publisher.js` (`upload-post` primary + Reddit OAuth fallback); missing credentials mark posts `SIMULATED` instead of `FAILED`; API secrets redacted in `lastError`
- [x] Bilingual (EN/HI) deterministic templates across all 8 categories × 2 tiers × 6 platforms (X ≤ 280 chars including share URL, authority handles, `#Samadhan` hashtags, not-official disclaimer, zero money/PII) + optional Gemini AI copywriting layer (`copywriter.js`) with server-side validation & automatic template fallback
- [x] Hooked `generateBundle({ issueId, tier })` into `tier.service.js checkTiers` (claim winner only, failure-isolated) and additive `social` bundle payload into `dispatch.service.js` n8n webhook
- [x] Atomic rejection takedown: `transitionIssue(..., 'REJECTED')` marks all `SocialPost` rows `TAKEN_DOWN` inside the rejection transaction and runs `removeIssuePostsRemote` best-effort after commit
- [x] Public endpoints: `GET /api/issues/trending`, `GET /api/issues/:issueId/social` (and `/api/social/issues/:issueId/social`), `POST /api/social/:postId/click` (IP rate-limited), and root `GET /i/:id` server-rendered Open Graph HTML page (crawler-safe `reachBySource` tracking + `404 noindex` for missing/REJECTED)
- [x] Admin endpoints (`/api/admin/social`): `GET /` (filters + `socialPublishMode`), `POST /:postId/publish`, `POST /:postId/retry`, `POST /:postId/regenerate`, `POST /:postId/takedown`, `PATCH /settings` (`AUTO` | `REVIEW` stored in `settings.socialPublishMode`)
- [x] `env.js` and `.env.example` updated with optional Phase 6 env vars

### Frontend

- [x] `OfficialCampaigns` (per-platform status badges, external links, `reachBySource` bar) and `HelpSpread` (platform selector, EN/HI toggle, X 280-char counter, copy caption, share intents, click tracking) integrated into `IssueDetailPage` for tier ≥ 1 issues
- [x] `ShareCardRender` + `shareCardPng` (`html-to-image` 1080×1080 PNG export using `i18n.getFixedT(lang)`)
- [x] `WhyRupee` (full section on `LandingPage`, compact disclosure on `ReportPage` and `IssueDetailPage`)
- [x] `TrendingPage` (`/trending`, public, category + city filters, reach badges, pagination) linked from `Navbar` and `IssuesPage`
- [x] `AdminSocialPage` (`/admin/social`, admin-only, linked from `Navbar`): `AUTO`/`REVIEW` mode toggle, status/platform/tier filters, EN/HI preview modal, publish/retry/regenerate/takedown actions

### i18n & Tests

- [x] `nav.trending`, `nav.adminSocial`, `social.*`, `share.*`, `why.*`, `trending.*`, `adminSocial.*` added to BOTH `en.json` and `hi.json` — parity 444/444 keys
- [x] 17 new tests in `server/src/modules/social/social.test.js` (95/95 total passing); `vite build` clean

### Documentation

- [x] Updated `docs/API.md`, `docs/CONTEXT.md`, and `docs/PROGRESS.md`

### Manual Test Checklist (Phase 6)

1. `cd server && npm run demo:on`, then start both servers (`server: npm run dev`, `client: npm run dev`)
2. Report an issue and support it to ₹20 (Tier 1) → open the issue detail page → verify **Official Samadhan Campaigns** (6 platforms, `SIMULATED` if social keys unset, `GENERATED` for WhatsApp) and **Help spread the word** appear
3. Toggle EN/HI in the Share widget, copy a caption (verify X ≤ 280 chars), and click **Download PNG card** → 1080×1080 PNG downloads cleanly in the chosen language
4. Visit `http://localhost:5000/i/<issueId>?s=wa` in a browser → verify Open Graph HTML renders, then reload the issue detail page → `reachBySource` shows `WA 1`
5. Visit `http://localhost:5173/trending` → Tier 1+ issue appears; test category and city filters
6. Login as admin (`admin@samadhan.local` / `Admin@12345`) → **Social** (`/admin/social`) → switch publish mode between `Auto` and `Review`, preview EN/HI copy, regenerate a post, and take down one post (verify it disappears from the public issue page)
7. Admin rejects a Tier 1+ issue → verify all its social posts become `TAKEN_DOWN` and `http://localhost:5000/i/<issueId>` returns 404 with `noindex`
8. Toggle हिंदी in the header → `/trending`, `/admin/social`, `Why ₹5 / ₹1?`, campaigns, and share widget all render in Hindi
9. `npm run demo:off` when finished testing; `cd server && npm test` → 95/95 passing

---

## Phase 7: Local Helpers & Reviews (Planned)

- [ ] Helper model with verification status
- [ ] Connect-before-contact flow
- [ ] Review system with verified connections
- [ ] Helper dashboard

---

## Phase 8: Maps, Notifications & Admin Panel (Planned)

- [ ] Leaflet map integration
- [ ] Notification center
- [ ] Full admin panel (users, issues, helpers, settings)

---

## Phase 9: Polish & Deploy (Planned)

- [ ] Hindi translation polish
- [ ] PWA manifest and service worker
- [ ] Rich seed data
- [ ] Integration tests
- [ ] Deployment guide
- [ ] Demo script

---

## Phase Handoff Template

Copy this block and fill it in at the end of each phase:

```markdown
## Phase N: [Name] ✅

**Completed:** YYYY-MM-DD

### Backend
- [x] Feature 1
- [x] Feature 2

### Frontend
- [x] Feature 1
- [x] Feature 2

### Documentation
- [x] Updated `docs/API.md` with new endpoints
- [x] Updated `docs/PROGRESS.md`

### Manual Test Checklist (Phase N)
1. Test step 1 → expected result
2. Test step 2 → expected result
```