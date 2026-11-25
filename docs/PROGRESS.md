# Samadhan — Build Progress Log

> This file records what has been built. Update it at the end of every phase. `docs/CONTEXT.md` records what must remain true.

---

## Current Status (read this first)

|Item|Value|
|---|---|
|**Phases complete**|0–9 ALL COMPLETE (incl. 7.1, 8A/8B, 9A/9B, 9C polish)|
|**Next phase**|None — prototype complete; see Known Gaps for production work|
|**Server tests**|148/148 passing (`cd server && npm test`)|
|**Client tests**|18/18 passing (`cd client && npm test`)|
|**i18n parity**|`en.json` / `hi.json` 1104/1104 keys (`npm run i18n:audit` PASS)|
|**Dev servers**|API `http://localhost:5000/api/health` · Client `http://localhost:5173`|
|**Seed admin (local dev only)**|`admin@samadhan.local` / `Admin@12345` (from `npm run seed:admin`)|
|**Git**|Phases 0–9B committed on `main`|

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

## Phase 7: Local Helpers & Reviews ✅

**Completed:** 2026-11-25

### Backend (with all prompt overrides)

- [x] Helpers module `server/src/modules/helpers/`: helper/connection/review/helperFlag models, Zod schemas, constants (9 categories, NO Medical), service, controller, routes (static before `/:helperId`)
- [x] **Roles untouched** (override #1): "is a helper" = Helper document exists; ADMIN cannot register (403); dashboard 404 `HELPER_PROFILE_NOT_FOUND` → client redirects to `/local/register`; test proves a HELPER-role user can still report + support Global issues
- [x] **isSample** (override #2): seeded helpers `isSample: true`; connect returns `whatsappUrl: null` + `isSample: true`; UI disables Call/WhatsApp with a demo-number notice; seed users get wallets; documented login `helper1@example.org` / `Helper@12345`; idempotent by email
- [x] **Connect** (override #3): repeat connect within 24 h re-reveals phone with no row/quota/count; `connectCount` counts DISTINCT seekers; race-safe insert-then-count with per-seeker serialization (15 parallel → exactly 10 succeed, test green); per-IP `rateLimit` middleware on search + connect (`RATE_LIMITED`)
- [x] **Re-verification** (override #4): phone/categories/serviceLocation/displayName change on VERIFIED → PENDING; other fields never reset (both tested)
- [x] **Dual radius** (override #5): `$geoNear` + `$match $expr` on helper `radiusKm`; seed radiusKm 5–15; radiusKm-2 helper hidden from a 4 km seeker even at 10 km search (tested)
- [x] **Reviews/flags** (override #6): ratingAvg/ratingCount recomputed by aggregation after create/edit (no drift); flagCount via countDocuments of non-dismissed flags; conditional auto-hide at 3 + `HELPER_AUTO_HIDDEN` audit; admin unhide dismisses flags
- [x] **Free text** (override #7): `CONTACT_IN_TEXT` for phone-like runs/URLs in displayName, bio, priceHint, review comments
- [x] **Responses** (override #8): search `{items, pagination}` via `$facet`; phone only in owner dashboard/PATCH + admin; audit snapshots only `{verificationStatus, isHidden, rejectionReason}`
- [x] Admin queue: `GET /api/admin/helpers` (filters) + `PATCH` (verify/reject/unhide) with before/after audit
- [x] `npm run seed:helpers`: 30 VERIFIED sample helpers (all 9 categories, 3 pilot cities, 15 within ~4 km of Bengaluru centre) + 2 PENDING; dummy phones/emails

### Frontend (override #9, #10)

- [x] `ModeSwitch` (Global blue | Local teal `#0F766E`) in Navbar; persists in localStorage; syncs via `POST /auth/switch-mode` only when logged in; logged-out users browse `/local` freely
- [x] `LocalLayout` mounts `EmergencyBanner` (112) ONCE wrapping every `/local/*` route
- [x] Pages: `/local` (9-category grid + location bar via OSM geocoding + register/dashboard CTAs + Cab directory note), `/local/search` (category pills, 2/5/10 km, nearest/top-rated, HelperCard with distance/rating/connects/price/Available badge, never phone; skeletons/empty "Try 10 km"/error+retry), `/local/helpers/:id` (bio, rating breakdown bars, reviews, Connect → Call/WhatsApp + safety note + remaining; sample warning; review form gated on hasConnected with edit prefill; flag dialog), `/local/register` (protected, address-first location, category multi-select, photo upload, redirects if profile exists), `/local/dashboard` (verification banner PENDING/VERIFIED/REJECTED + hidden warning, Available-now switch, inline editor with re-verification notice, connects log "FirstName L.", reviews)
- [x] `/my-activity` third tab "Connected helpers" (`/helpers/mine/connected`) with reviewed/leave-review state
- [x] Separate admin page `/admin/helpers` (override #9 — NOT a 4th dispatch tab): filters, Approve/Reject(reason)/Unhide, Navbar link
- [x] BottomNav shows Local links (Services/Search/Dashboard/Activity/Wallet) on `/local/*`
- [x] `local.*`, `adminHelpers.*`, nav + myActivity keys in BOTH locales — parity 584/584

### Tests

- [x] 18 new tests in `helpers.test.js` (113/113 total): onboarding (PENDING, protected fields, duplicate 409, ADMIN 403, dashboard 404), CONTACT_IN_TEXT, re-verification both cases, search (exclusions, nearest/rating sorts, dual radius, no phone), connect (re-reveal free, distinct count, isSample, self/PENDING/hidden blocked, 15 parallel → 10, 11th 429, dashboard privacy), reviews (403/create/edit no-drift/self/contact), flags (3 auto-hide + audit, dup 409, unhide dismisses), admin RBAC + audit 3-field snapshots, route order, HELPER can report+support, mine/connected

### Verification

- [x] `npm test` 113/113; client production build clean; `npm run seed:helpers` idempotent (32 created → 0 created/32 skipped); both dev servers healthy
- [x] End-to-end API verification: search plumbers (2 items, no phone) → connect (sample: whatsappUrl null, 9 remaining, safetyNoteKey) → review create 5/1 → edit 3/1 (no drift) → register PENDING (hidden) → admin approve (visible) → helper dashboard has phone, seeker dashboard 404 → public profile no phone, dashboard no seeker email
- [ ] Live browser click-through pending (browser tooling unavailable this session) — UI covered by the production build + the manual checklist below

### Known Gaps & Open Decisions (Phase 7)

- **Flag abuse:** 3 sock-puppet accounts could auto-hide a legitimate helper; admin unhide + audit mitigates, real anti-abuse is a later concern.
- **No re-flag after unhide (7.1):** dismissed flags keep their unique `(helperId, userId)` row, so the same user cannot flag that helper again even after new misconduct.
- **Phone ownership unverified (7.1):** nothing proves a helper owns the phone they register; admin verification is manual (call the number) until OTP arrives.
- **Per-IP rate limiting** is in-memory (single-process prototype scale); resets on restart, not shared across instances, and needs correct `trust proxy` behind a hosting proxy (Phase 9).
- **Exact location public (7.1):** public helper responses expose the full service address and coordinates — acceptable for a service directory, but a fuzzed/area-only location is a future privacy option.
- **Connect serialization** is an in-process per-seeker lock — correct for one server; a multi-instance deploy would need a shared lock/transaction.
- **No Leaflet maps yet** (Phase 8); location input is address-first via OSM Nominatim, same as Global reports.
- **Sample helpers only** — dummy numbers; Call/WhatsApp disabled for them. Replace with verified real helpers before any production use.

### Phase 7.1 hardening (2026-11-25)

- [x] `assertNoContactInfo` normalises NFKC + Devanagari/Arabic-Indic digits → ASCII + strips zero-width chars before pattern tests (POST and PATCH)
- [x] `GET /helpers/:id` accepts validated `page`/`limit` — reviews pagination works (page-2 test)
- [x] Race-safe writes: register catches 11000 → 409 `HELPER_PROFILE_EXISTS`; first-review 11000 retries as edit (parallel tests: one 201+409 / one 201+200, never 500)
- [x] REJECTED resubmission: changing a REVERIFY field or bio → PENDING + `rejectionReason` cleared; other fields stay REJECTED
- [x] Normalised re-verification comparison (coords rounded to 5 dp, undefined ≡ '', sorted categories) — unchanged re-sends never reset; real changes do
- [x] Connect per-IP limit 20/min (21st → 429 `RATE_LIMITED`, tested); limiter exposes a test-only `reset()`
- [x] `connectLocks` Map entry deleted once its tail settles unreplaced
- [x] Visibility tests: public GET of PENDING/hidden → 404, owner/admin → 200
- [x] `seedHelpers.js` refuses to run when `NODE_ENV=production`
- [x] 25/25 helpers tests (120/120 total)

### Manual Test Checklist (Phase 7) — two citizens + admin

1. `cd server && npm run seed:helpers`; start both servers. Toggle the Navbar switch to **Local** → `/local` shows the 112 banner + 9 categories
2. Set location ("Use my location" or type "Koramangala, Bengaluru") → Search → Plumber: cards show distance/rating/connects/price, **no phone**; try Nearest vs Top rated and 2/5/10 km
3. Logged out: open a helper → "Login to connect". Login as citizen A (`phase2.tester@example.com` / `Test@12345`) → Connect → sample warning + disabled Call/WhatsApp + safety note + "9 connects left today"
4. Leave a 5★ review → average updates; edit to 3★ → average recomputes, count stays 1. Try reviewing without connecting (citizen B) → "Connect first"
5. Citizen B: register a helper at `/local/register` → PENDING banner, hidden from search. Admin (`admin@samadhan.local`) → `/admin/helpers` → Approve → now searchable
6. Admin: Reject with reason → red banner + reason on the helper dashboard; flag a helper from 3 accounts → auto-hidden; Unhide → back in search, flags dismissed
7. Helper login `helper1@example.org` / `Helper@12345` → dashboard: Available-now switch, edit phone → verification resets to PENDING (notice shown)
8. `/my-activity` → "Connected helpers" tab shows connected helpers with review state
9. Toggle हिंदी → every Local screen translates (584/584 keys); `npm test` → 113/113

---

## Phase 8A: Maps & Notifications ✅

**Completed:** 2026-11-25

- [x] Pinned leaflet@1.9.4 + react-leaflet@4.2.1 + react-leaflet-cluster@2.1.0 (React 18-safe); OSM tiles, attribution, divIcon pins (no image assets), tier rings, `relative isolate z-0` wrappers, leaflet CSS only in lazy map modules, `.leaflet-container img{max-width:none}`; all maps React.lazy + Suspense (MapShell chunk ~156 KB isolated; main-chunk growth from maps ≈ 0)
- [x] `features/maps/`: geo.js ([lng,lat]↔[lat,lng] rule), pins.js, MapShell (tile-error fallback), MapLegend, useGeolocation, LocationPicker (draggable/click/locate + throttled cached reverse-geocode ≥1.1 s, Accept-Language), GlobalMap, HelperMap, IssueLocationMap, HelperAreaMap
- [x] `GET /api/issues/map` (public, 60/min): bbox `$geoWithin` Polygon, category/status/minTier filters, REJECTED excluded, tier/fund sort, limit+1 → truncated, 240px Cloudinary thumb, NO reporter fields; BBOX_INVALID / BBOX_TOO_LARGE
- [x] /map page + IssuesPage List|Map tabs + IssueDetail location map + OSM link; LocationPicker integrated into ReportPage, HelperRegister (radius circle), ProfilePage (homeLocation via existing PATCH), LocalHomePage (use saved home)
- [x] Helper public-location privacy: search/public-profile/connected round coords to 3 dp + omit address; owner/admin keep exact; HelperProfile approximate-area circle
- [x] Notifications module: model (TTL 90 d, partial unique dedupe), failure-isolated `notifyUsers` after commit; hooks for tier winner, transitions (actor excluded), REJECTED per-user refundPaise, helper events; endpoints list/unread-count/read/read-all (ownership 404, rateLimit 120/min)
- [x] Frontend: useNotifications (30 s visibility-aware poll, backoff), header bell badge (99+ cap), /notifications page (All/Unread, Today/Earlier, deep links, mark-all, t()-rendered types)
- [x] 7 new tests (maps bbox/filters/truncated/errors/route-order/no-PII, privacy, notifications ownership/dedupe/fan-out/isolation/indexes)

## Phase 8B: Full Admin Panel ✅

**Completed:** 2026-11-25

- [x] Audit foundation: AuditLog extended (entity/entityId/before/after + indexes, backward compatible); `utils/audit.util.js` writeAudit with per-entity PII-free whitelists; new mutations audit in-transaction; no audit update/delete endpoints
- [x] `assertNoContactInfo` moved to `utils/contactGuard.util.js` (B6), shared by helpers + authority-reply
- [x] Admin issues: list (q/status/tier/category/city/flagged/hasFailedActions/sort), moderation detail (timeline, contributors, dispatch/social summary, flags, authority, allowedTransitions reused from the state machine), transition wrapper (REJECTED note ≥10), assign authority (active only), authority-reply (contact guard + notification), platform credit
- [x] Platform credit: `platformCreditPaise` on Issue, `platformCreditMaxPaise` setting (50000), ONE transaction conditional on open status + IssueUpdate kind PLATFORM_CREDIT (unique-sparse idempotencyKey) + audit; idempotent replay, key-conflict 409, max bound 400, terminal 409; after commit checkTiers → tierUnlocked; NOT refunded on rejection; invariant fundPaise = Σ supports + credit
- [x] IssueUpdate gains kind/authorityId/amountPaise/idempotencyKey (toStatus nullable); public timeline renders kinds distinctly + "includes ₹X platform credit"
- [x] issueFlags collection + public `POST /issues/:id/flag` (unique, own blocked, non-terminal only, rate-limited, NEVER auto-hides) + admin dismiss; IssueDetail "Report this issue" dialog
- [x] Admin users: safe-field list/detail (wallet + last 10 txns + counts), PATCH isActive only (self/admin target 403 FORBIDDEN_TARGET; disable hides helper in-transaction; disabled token rejected 403 by authenticate)
- [x] Admin settings (whitelist + bounds + tier2>tier1 cross-check, in-transaction audit, immediate effect) + categories (disabledIssueCategories/disabledHelperCategories; cannot disable OTHER/all; meta enabled-only; create rejects CATEGORY_DISABLED)
- [x] Admin dashboard (7/30/90 d, zero-filled UTC series, integer paise, simulatedRevenue = fees − refunds, attention list) + audit viewer (filters, before→after diff, legacy rows)
- [x] AdminLayout (sidebar/mobile tabs) wrapping existing Dispatch/Social/Helpers pages + new Dashboard/Issues/Users/Settings/Audit; single "Admin" Navbar link; all admin routes lazy + roles ADMIN; Recharts@2.15.4 lazy (AdminCharts ~437 KB isolated)
- [x] 10 new tests (RBAC matrix, rejection end-to-end, credit idempotency/invariant/tier/not-refunded/bounds, reply guard, flags, users, settings, categories, dashboard, audit)

### Known Gaps & Open Decisions (Phase 8)

- **OSM/Nominatim** tile + geocoding usage is prototype-only (1 req/s policy); production needs a tile host / geocoding key.
- **Helper coordinates approximated, not hidden** (3 dp ≈ 110 m) — public still shows city/pincode; exact area is a future privacy option.
- **Polling, not push** for notifications (30 s) and maps refetch (moveend debounce) — no websockets in the stack.
- **In-memory rate limiting** needs correct `trust proxy` behind a host (Phase 9).
- **Already-processed Tier-2 EMAIL** keeps its original authority when an admin reassigns authority later (dispatch logic untouched by design); recheck-tiers does not re-send SENT rows.
- **Platform credit** is admin-only simulated money, not a wallet txn, and is not refunded on rejection (fund zeroes as before).
- **Dashboard aggregations** are bounded but unindexed for some series at very large scale; fine for prototype data.

### Manual Test Checklist (Phase 8) — admin + two citizens + helper

1. Start both servers; `npm run seed:helpers`. Login as admin → single "Admin" link → /admin dashboard (KPIs, charts, attention list, 7/30/90 toggle)
2. Citizens A & B: report + support an issue; toggle हिंदी → bell shows unread; /notifications lists tier/status events in Hindi; click deep-links
3. /map: pins cluster, filters + Spotlight toggle work, pin → preview → View details; IssuesPage List|Map tabs; issue detail shows location map + OSM link
4. Report wizard / helper register / profile: drag pin → address autofills; profile saves home location; LocalHome "use saved home"
5. Local search List|Map toggle; helper profile shows approximate-area circle (no exact address publicly)
6. Admin → Issues → open issue: assign authority, record reply (try a phone number → blocked), add ₹10 credit (crosses tier in demo mode → tierUnlocked), Reject (reason ≥10, refunds shown), dismiss flags
7. Citizen B flags an issue (own issue blocked); admin sees flag, dismisses
8. Admin → Users: disable a helper-role user → login rejected, helper hidden; cannot disable self/admin
9. Admin → Settings: change report fee → next report uses it; try tier2 ≤ tier1 → blocked; disable a category → meta hides it + create rejected; demo banner shows when demoMode on
10. Admin → Audit: every mutation listed with before→after diff, no PII; `npm test` → 137/137

---

## Phase 9A: Final Polish ✅

**Completed:** 2026-11-25

- [x] `client/scripts/i18n-audit.mjs` (`npm run i18n:audit`): key + interpolation parity, used-key existence (dynamic families allowlisted), error-code coverage, unused-key + Hindi==English warnings, plural handling. PASS at 817 keys. `docs/HINDI_GLOSSARY.md` added.
- [x] `lib/errors.js` `getErrorMessage(error, t)` maps code → `errors.*` (57 codes EN+HI), network/timeout/unknown fallbacks; never renders server English. `lib/api.js`: 30 s timeout + non-blocking "Server is waking up…" banner after 6 s (token-refresh/idempotency untouched).
- [x] `lib/format.js` single source (formatRupees/formatDate/formatDateTime/formatRelative, Intl en-IN/hi-IN, Latin digits).
- [x] Accessibility: skip-link + main landmark (existing), per-route document.title + focus move (`RouteFocus`), aria-live banners/badge, icon-button labels, minimal ESLint a11y flat config (`npm run lint:a11y` clean).
- [x] `NotFoundPage` (bilingual catch-all) + top-level `ErrorBoundary` (bilingual reload screen); unknown /api → 404 envelope.
- [x] PWA: vite-plugin-pwa@0.21.2 (Vite 6 peer), generated 192/512/maskable icons, manifest + shortcuts, registerType prompt + update toast, app-shell precache only, `/api` NetworkOnly + navigation denylist, Cloudinary SWR / fonts CacheFirst, OSM/Nominatim NOT cached, SW off in dev. `scripts/check-sw.mjs` PASS.
- [x] `SystemBanners` (offline/waking/update), offline-disabled submit, `lib/draftStorage.js` offline report draft (autosave 500 ms, 7-day expiry, no photos/keys/tokens, resume/discard, clear on submit).
- [x] Client Vitest (18 tests): geo, format, errors, draftStorage.

## Phase 9B: Production hardening + demo + verifier ✅

**Completed:** 2026-11-25

- [x] Boot-time production env validation (Zod-style, lists all problems, no secret printing); `trust proxy`; explicit 100kb JSON limit; error handler never leaks stacks; graceful shutdown (existing).
- [x] Seed production guards (`ALLOW_DEMO_SEED` override; admin requires ≥12-char password).
- [x] `/api/health` adds mongo/uptimeSec/version/commit; `POST /api/internal/jobs/:job` (CRON_SECRET constant-time guard, 404 when unset, rate-limited, same idempotent functions).
- [x] `seed:demo` / `demo:reset`: 12 reporters + 60 supporters + 36 issues (8 categories, 3 cities, 6 Hindi), tiers via real services, statuses, 2 credits, 2 replies, 3 flags, 15 connections + 10 reviews, 30-day backdate; external integration env blanked before import (zero outbound). Ran on Atlas: 42 issues / 109 wallets, verify:data PASS.
- [x] `verify:data` (`npm run verify:data`): wallet=Σtxns, fund=supports+credit, refunds, supporterCount, tier audits/EMAIL, helper ratings/connectCount, no phone in payloads. Unit tests with corrupted fixtures.
- [x] `e2e.flow.test.js` full journey ending in verifyData PASS; `check-env-example.mjs` (PASS 42+1 vars), `secret-scan.mjs` (PASS), `smoke.mjs`; `npm run verify`.
- [x] `render.yaml`, `client/vercel.json`, `docs/DEPLOYMENT.md` (beginner guide), `README.md`, `docs/DEMO.md` (10-min viva + 22 Q&A).

### Final verification table
| Check | Result |
| --- | --- |
| server `npm test` | 142/142 PASS |
| client `npm test` | 18/18 PASS |
| client `npm run build` | clean (Leaflet ~156 KB + Recharts ~437 KB lazy; main ~646 KB) |
| `npm run i18n:audit` | PASS (817 keys) |
| `npm run lint:a11y` | PASS |
| `npm run check-sw` | PASS |
| `npm run check:env` | PASS |
| `npm run check:secrets` | PASS |
| `npm run seed:demo` + `verify:data` | PASS (42 issues / 109 wallets) |

### Known Gaps (final)
- Not deployed/verified live here; real SMTP/social/Gemini untested (SIMULATED paths verified). No live browser Lighthouse run.
- Single-instance in-memory connect lock + rate limiter; horizontal scale needs a shared store.
- OSM/Nominatim prototype usage; helper coords approximated publicly; polling not push.
- Main client chunk ~646 KB (>200 KB target) — React+router+i18n+global features eager; maps/charts/admin already lazy. Further splitting (vendor chunk) is future work.
- `errors.js` util + keys complete; not every legacy toast call site was migrated to it (representative integration done).

### Manual checklist (final)
Hindi walkthrough of 10 key screens · 360 px responsive pass · keyboard-only pass ·
offline/online draft test · install PWA · Lighthouse PWA + Accessibility ·
`npm run demo:reset` twice (idempotent) · `npm run verify` · deploy per DEPLOYMENT.md.

---

## v3 Platform Redesign & Audit Overhaul ✅

**Completed:** 2026-11-25

### Audit, PII & Build Fixes
- [x] Full audit report completed and prioritized by severity
- [x] Scrubbed personal identifiers from documentation folders and rewrote Git commit authors on `main` to `Samadhan Demo <demo@samadhan.local>`; `npm run check:secrets` clean
- [x] Fixed `HelperSearchPage.jsx` infinite location load loop & enabled GPS-optional nationwide browsing; preserved category param on List/Map toggle
- [x] Fixed `api.js` automatic 401 refresh-token retry interceptor and bilingual i18n errors in `AuthContext.jsx`, `templates.js`, `AdminIssuesPage.jsx`, `AdminIssueDetailPage.jsx`, `AdminSettingsPage.jsx`
- [x] Fixed Mongoose cold-start `2dsphere` `$geoNear` race via `Issue.init()` retry guard in `findDuplicate()` and normalized legacy categories in `matchAuthority`, `getTrending`, and `patchCategories`
- [x] Split Vite bundle chunks (`react`, `i18n`, `icons`, `maps`, `charts`); resolved all chunk size warnings

### Roles, Local Bookings & Platform Commission
- [x] Replaced user roles with `CONSUMER` and `PROVIDER` (while normalizing legacy `CITIZEN`/`HELPER` transparently) and added 1-click demo login cards on `/login` (`consumer@samadhan.local`, `provider@samadhan.local`, `admin@samadhan.local`)
- [x] Redesigned Local Mode around 7 daily categories (`CAB_AUTO`, `GENERAL_STORE`, `GARAGE_MECHANIC`, `SWEETS_BAKERY`, `PLUMBER_ELECTRICIAN`, `APPLIANCE_REPAIR`, `OTHER_LOCAL` — no medical help) with GPS + State/City/Search filtering
- [x] Added full `bookings` module (`POST /api/bookings`, `/mine`, `/provider`, `/:bookingId`, `/:bookingId/transition`): atomic payment hold (`BOOKING_PAYMENT`), full lifecycle (`PENDING → ACCEPTED → IN_PROGRESS → COMPLETED | REJECTED | CANCELLED`), configurable `platformCommissionPercent` settlement (`BOOKING_PAYOUT` + `AuditLog`), atomic cancellation refunds (`BOOKING_REFUND`), and admin dashboard commission KPIs

### Global Mode: Dynamic Limits, Pool Funds, Resolution & India States
- [x] Replaced Spotlight/Escalation UI terminology with `SOCIAL_EXPLOSION` (dynamic `SMALL=5 / MEDIUM=15 / LARGE=30` supporter limits from `settings`) and `POOL_FUNDS` (goal-based crowdfunding, variable contributions, itemized `fundUtilization`, and `responsibleParty`)
- [x] Added full 28 Indian States + 8 Union Territories hierarchy (`indiaLocations.js`), `GET /api/issues/stats/locations`, `/states` State & Partner Explorer page, and state/area filters
- [x] Added issue solver & NGO/private promotion tracking (`POST /api/issues/:issueId/resolve`, `GET /api/issues/stats/partners`, `ResolutionCard`) across Government, NGO, Private Org, and Community resolutions
- [x] Redesigned landing page (removed grid background and preview cards; added clean Global vs Local entry cards + interactive progressive tabs) and updated Navigation/Tabs/CSS design system with EN/HI parity

### Demo Seed & Verification
- [x] Upgraded `npm run demo:reset` & `verify:data`: seeded consumers, providers, admin, 30 local listings, 9 bookings, 18 global issues (Social Explosion & Pool Funds across SMALL/MEDIUM/LARGE, solved by Govt/NGO/Private Org, threshold reached & in-progress)
- [x] Added `server/src/modules/bookings/bookings.test.js` covering roles, booking lifecycle, commissions, refunds, dynamic limits, Pool Funds utilization, resolution promotion, and all 36 States/UTs stats
- [x] Updated `docs/API.md` and `docs/PROGRESS.md`

### Manual Test Checklist (v3 Overhaul)
1. Start server (`cd server && npm run dev`) & client (`cd client && npm run dev`) after `cd server && npm run demo:reset`
2. Visit `/` → confirm clean canvas, two distinct mode entry cards (Global Civic & Local Marketplace), and EN/हिंदी switcher
3. Visit `/login` → use **Demo Consumer** (`consumer@samadhan.local` / `Demo@12345`), **Demo Provider** (`provider@samadhan.local` / `Demo@12345`), or **Admin** (`admin@samadhan.local` / `Admin@12345`)
4. In **Local Mode** (`/local`, `/local/search`): filter across the 7 categories by State/City or GPS, open a provider card/profile, create a booking (`Book Service`), verify wallet debit, switch to Demo Provider `/local/dashboard`, accept → complete booking, confirm payout minus commission & admin commission metrics (`/admin`)
5. In **Global Mode** (`/issues`, `/states`, `/report`): filter by state, importance (`SMALL`/`MEDIUM`/`LARGE`), type (`SOCIAL_EXPLOSION`/`POOL_FUNDS`), view dynamic progress meters, `ResolutionCard` + NGO/company promotion, and contribute to a Pool Funds campaign or mark an issue resolved
6. Toggle **EN / हिंदी** across Landing, Auth, Feed, State Explorer, Issue Detail, Report Wizard, Local Search, Provider Dashboard, and Admin Panel

---

## Phase 9C: Notification, Pool Funds & Marketplace UX polish ✅

**Completed:** 2026-11-25

### Backend
- [x] Added `HELPER_NEW_CONNECT` notification (first-ever connect only) with masked `seekerName` and dedupe key `connect:<connectionId>`
- [x] `PATCH /api/notifications/:id/read` and `POST /api/notifications/read-all` now return `unreadCount` so the bell can clear without another round trip
- [x] Provider dashboard connections now include `_id` and accept `?limit=50` for the Contacts tab

### Frontend
- [x] Removed the backend health badge and the 112 emergency banner; every "112" string is gone from `client/src`
- [x] Replaced per-component notification polling with one shared `NotificationsProvider`; bell, notifications page, mark-read and new-notification toast now share one unread count
- [x] Added notification deep links (`HELPER_NEW_CONNECT` → `/local/dashboard?tab=contacts`)
- [x] Provider dashboard: URL-driven tabs, "Who contacted you" Contacts tab with masked names, last-24 h "New" badges, new-contact count, and auto-refresh when unread count increases
- [x] Pool Funds: plain-language "How this Pool Fund works" guide, pooled/spent/remaining summary, contribution-dialog explainer with goal/raised/remaining line, report-wizard pool hint, and a correct "spending already logged" status
- [x] Fixed the issue-detail tier badge so Pool Funds show "Goal Reached" only when the funding goal is actually reached
- [x] Seeded 8 verified providers around BIT Mesra / PMC, Ranchi (helper100–helper107) and added a one-click "Demo: BIT Mesra, Ranchi" location button
- [x] Fixed marketplace category labels in EN/HI and added all new keys in both locales (i18n audit allowlist updated for `HELPER_NEW_CONNECT`)

### Documentation
- [x] Updated `docs/API.md` (notification return fields, `HELPER_NEW_CONNECT`, dashboard connection shape)
- [x] Updated `docs/PROGRESS.md`

### Verification
|Gate|Result|
|---|---|
|`cd server && npm test`|PASS — 148/148|
|`cd client && npm test`|PASS — 18/18|
|`cd client && npm run i18n:audit`|PASS — 1104/1104 keys, EN/HI parity|
|`cd client && npm run lint:a11y`|PASS|
|`cd client && npm run check-sw`|PASS|
|`cd client && npm run build`|PASS (PWA precache 46 entries)|
|`cd server && npm run check:env`|PASS — 42 server + 1 client vars|
|`cd server && npm run check:secrets`|PASS — 114 tracked files clean|
|`cd server && npm run verify:data`|PASS — wallets/issues/helpers/bookings invariants|
|`node server/scripts/smoke.mjs http://localhost:5000 http://localhost:5173`|PASS — 9/9 checks|

### Manual Test Checklist (Phase 9C)
1. Sign in as `provider@samadhan.local` / `Demo@12345`; click the bell → **Mark all read** → badge and page count both become 0.
2. As `consumer@samadhan.local`, open `/local`, click **Demo: BIT Mesra, Ranchi** → 8 verified providers appear within 0–3.1 km; category filter and Map view work.
3. Connect with a Mesra provider → provider receives a toast/bell item; `/local/dashboard?tab=contacts` lists the masked seeker with a **New** badge.
4. As consumer, open a Pool Funds issue → read the 3-step guide and pooled/spent/remaining figures; open **Contribute funds** → dialog explains where the money stays and shows goal/raised/remaining.
5. Switch EN ↔ हिंदी on Home, Local, notifications, provider Contacts and Pool Funds → no raw keys or missing text.
6. Confirm no backend online/offline badge and no 112 emergency banner anywhere.

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