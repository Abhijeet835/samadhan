# Stage 1: Verified Codebase Fact Sheet (`samadhan v2`)

> **Ground-Truth Guarantee:** Every package version, schema field, index, endpoint, threshold, algorithm step, test count, and build metric below is recorded directly from files and tool outputs observed in `c:\Users\abhij\samadhan v2`. No conceptual draft assumptions or unmeasured latencies are treated as implemented fact.

---

## 1. Project & Report Metadata

- **Repository / System:** `samadhan v2` (`samadhan-server@0.1.0`, `samadhan-client@0.1.0`) — an intermediate-level college prototype bilingual (English / Hindi) dual-mode civic utility platform.
- **Authors:** Demo Student A (`DEMO/001/26`, CSE) & Demo Student B (`DEMO/002/26`, CSE).
- **Guide & Institution:** Faculty Guide, Department of Computer Science and Engineering, Birla Institute of Technology (BIT), Demo Campus, Demo Campus, India.
- **Target Report Constraints (`docs/Project Report Template.pdf`):** A4 page size (21 × 29.7 cm), 2.54 cm margins, Times New Roman, 1.5 line spacing, no paragraph indent, justified 12 pt body text, 18 pt bold title, 18 pt bold italic chapter titles, 16 pt bold sections, 14 pt bold subsections, maximum 5 chapters (each on a new page), maximum 30 body pages, Abstract ≤ 250 words (zero citations), Acknowledgement ≤ 300 words, computer-generated figures/tables with `Figure X.Y` / `Table X.Y` captions, numbered `REFERENCES`, mandatory iThenticate similarity compliance.

---

## 2. Implemented Features vs. Out-of-Scope / Earlier Conceptual Drafts

Earlier reference drafts attached (`Samadhan_Revised_Blueprint...`, `Problem_Solving_Platform...`) described unbuilt enterprise proposals. The actual `samadhan v2` implementation is strictly documented below:

| Domain | Actually Implemented in `samadhan v2` | NOT Implemented (Out-of-Scope Prototype Boundaries) |
| :--- | :--- | :--- |
| **Core Stack** | MERN monolith: React 18 + Vite 6 + Tailwind CSS 3 + Express 5 + Mongoose 9 + Zod 4 + MongoDB Atlas (`2dsphere` + replica-set transactions) | No PostgreSQL/PostGIS, no Redis, no FastAPI, no Next.js, no Redux, no Material UI, no Docker/Kubernetes |
| **Payments & Money** | Simulated wallet with integer paise (`balancePaise >= 0`), top-up packs (`₹10/20/50/100`), atomic ledger (`walletTxns`), idempotency keys, full spam-rejection refunds | No real Razorpay/UPI/bank payment gateway integration; zero real-money transfer |
| **Tier Escalation** | Two-tier threshold engine (`Tier 1 = ₹200` Spotlight, `Tier 2 = ₹500` Escalation; Demo Mode `₹20 / ₹50`) stored in dynamic `settings` collection | No 5-tier 25–10,000 upvote progression, no CSR/NGO grant portal, no automated municipal CRM API writeback |
| **Issue Lifecycle** | Strict state machine (`ACTIVE -> ACKNOWLEDGED -> IN_PROGRESS -> RESOLVED -> CLOSED` or `REJECTED`), reporter reopen within `autoCloseDays` (7 d), `node-cron` + `/api/internal/jobs/autoclose` | No field-inspector native mobile app |
| **Social & Dispatch** | Bilingual 6-platform bundle (Gemini AI copywriter `gemini-3.5-flash-lite` or deterministic templates), server-rendered `/i/:id` OG HTML + reach counter, `1080x1080` client PNG share card, Nodemailer / n8n / Telegram / Buffer / Reddit publishers with clean `SIMULATED` fallbacks when credentials omitted | Live external broadcasting occurs only when valid third-party tokens/SMTP credentials are configured |
| **Local Helpers** | Free directory across 9 fixed trade categories (`Medical Help` intentionally excluded; persistent `112` emergency banner), `$geoNear` + worker `radiusKm` double filter, connect-before-contact (`10/24 h` per seeker), 3-decimal coordinate fuzzing, connection-gated verified reviews, 3-flag auto-hide, Unicode contact guard | No in-app cab fare calculator or ride booking, no commission escrow, no automated SMS OTP phone verification (`isPhoneVerified` flag unused in self-service signup) |
| **Scaling & Notifications** | 30 s visibility-aware unread polling with exponential backoff up to 5 min; per-IP in-memory sliding-window `rateLimit` and `connectLocks` `Map` | Single-instance process memory (no Web Push / SSE, no Redis distributed locks) |

---

## 3. Verified Tech Stack & Dependency Inventory

### Backend (`server/package.json` — Node `>=20.19.0`, ESM `"type": "module"`)
- **Framework & Validation:** `express ^5.3.0`, `zod ^4.6.7`, `cors ^2.8.5`, `helmet ^8.3.0`, `dotenv ^18.0.10`
- **Database:** `mongoose ^9.13.0` (MongoDB Atlas with wiredTiger replica-set transactions & `2dsphere` geospatial index)
- **Auth & Security:** `bcrypt ^6.0.0` (10 salt rounds), `jsonwebtoken ^9.0.3`
- **Media, Mail & Scheduling:** `cloudinary ^2.11.0`, `multer ^2.5.0` (5 MB memory storage, JPEG/PNG/WebP), `nodemailer ^10.6.1`, `node-cron ^4.6.0`
- **Testing & Tooling:** `vitest ^5.1.1`, `supertest ^7.3.2`, `mongodb-memory-server ^11.4.0`, `nodemon ^3.1.14`

### Frontend (`client/package.json` — React 18 SPA + PWA)
- **Core UI & Routing:** `react 18.3.1`, `react-dom 18.3.1`, `react-router-dom ^6.30.6`, `axios ^1.21.1`, `react-hot-toast ^2.6.1`
- **Styling & Icons:** `tailwindcss ^3.4.17`, `@radix-ui/react-slot ^1.5.0`, `class-variance-authority ^0.7.1`, `clsx ^2.1.1`, `tailwind-merge ^3.7.1`, `lucide-react ^1.79.0`
- **I18n:** `i18next ^24.2.3`, `react-i18next ^15.7.4` (EN + HI JSON catalogs, `Noto Sans Devanagari` + `Inter`)
- **Maps, Charts & Export:** `leaflet 1.9.4`, `react-leaflet 4.2.1`, `react-leaflet-cluster 2.1.0`, `recharts 2.15.4`, `html-to-image ^1.11.11`
- **Build, PWA & Audit:** `vite ^6.4.6`, `vite-plugin-pwa 0.21.2`, `eslint 9.17.0`, `eslint-plugin-jsx-a11y 6.10.2`, `vitest 2.1.9`, `jsdom 25.0.1`

---

## 4. Repository Module Architecture

- **Backend (`server/src/modules/` — 13 feature modules following `routes -> validate -> auth/role -> controller -> service -> model`):**
  `health`, `users`, `wallet`, `issues`, `uploads`, `authorities`, `tiers`, `dispatch`, `social` (+ `publishers/{buffer,reddit,telegram}.publisher.js`, `copywriter.js`, `templates.js`, `sanitize.js`, `og.controller.js`), `helpers`, `notifications`, `admin`, `internal`.
- **Server Infrastructure (`server/src/`):**
  - `config/`: `db.js`, `env.js` (42 freeze-locked env vars + `validateProductionEnv()`), `cloudinary.js`
  - `middleware/`: `auth.middleware.js` (`authenticate`, `optionalAuth`), `role.middleware.js` (`authorize`, `requireAdmin`, `requireHelper`, `checkOwnership`), `validate.middleware.js`, `rateLimit.middleware.js`, `error.middleware.js`
  - `utils/`: `apiResponse.js`, `audit.util.js`, `contactGuard.util.js`, `jwt.util.js`
  - `jobs/`: `index.js`, `autoClose.job.js` (`0 * * * *`), `dispatchSweep.job.js` (`*/10 * * * *`)
  - `seed/`: `seedGuard.util.js`, `admin.seed.js`, `authorities.seed.js`, `seedHelpers.js`, `seedDemo.js`
  - `scripts/`: `demo-mode.js`, `run-autoclose.js`, `verify-data.js` (`server/scripts/` holds `check-env-example.mjs`, `secret-scan.mjs`, `smoke.mjs`)
- **Frontend (`client/src/`):**
  - `pages/` (21 route pages): `LandingPage`, `LoginPage`, `RegisterPage`, `ProfilePage`, `WalletPage`, `IssuesPage`, `IssueDetailPage`, `ReportPage`, `MyActivityPage`, `TrendingPage`, `GlobalMapPage`, `NotificationsPage`, `LocalHomePage`, `HelperSearchPage`, `HelperProfilePage`, `HelperRegisterPage`, `HelperDashboardPage`, `AdminDispatchPage`, `AdminHelpersPage`, `AdminSocialPage`, `NotFoundPage`.
  - `features/`: `global/`, `local/`, `maps/`, `notifications/`, `wallet/`, `admin/` (6 sub-pages + `AdminCharts.jsx` lazy-loaded).
  - `components/`: `layout/` (`Navbar`, `BottomNav`, `Footer`, `SiteLayout`), `landing/`, `ui/`, `SystemBanners`, `ProtectedRoute`, `ErrorBoundary`, `ModeSwitch`.
  - `lib/`: `api.js` (cold-start 6 s wake event + Bearer injector), `draftStorage.js`, `errors.js`, `format.js`, `utils.js`.

---

## 5. Annotated Database Schema Dictionary (All 17 MongoDB Collections)

All timestamps stored in UTC (`timestamps: true` unless immutable `updatedAt: false`). All financial amounts stored as signed/unsigned **integer paise** (`100 paise = ₹1`).

| # | Collection (`Model`) | Core Fields & Validation Constraints | Indexes |
| :---: | :--- | :--- | :--- |
| 1 | `users` (`User`) | `name` (2–100 chars), `email` (lowercase), `password` (`select: false`, min 8, bcrypt 10), `phone` (`/^[6-9]\d{9}$/`), `role` (`CITIZEN\|HELPER\|ADMIN`), `language` (`en\|hi`), `homeLocation` (GeoJSON Point), `activeMode` (`GLOBAL\|LOCAL`), `isEmailVerified`, `isPhoneVerified`, `isActive` (`true`), `lastLoginAt` | `unique(email)`, `2dsphere(homeLocation)`, `role: 1` |
| 2 | `wallets` (`Wallet`) | `userId` (ref `User`), `balancePaise` (integer `>= 0`, default `0`) | `unique(userId)` |
| 3 | `wallettxns` (`WalletTxn`) | `userId` (ref `User`), `type` (`TOPUP\|REPORT_FEE\|SUPPORT_FEE\|REFUND\|PLATFORM_CREDIT\|SIGNUP_CREDIT`), `amountPaise` (non-zero signed integer), `issueId` (ref `Issue`, opt), `idempotencyKey`, `updatedAt: false` | `unique(idempotencyKey)`, `userId: 1`, `(userId: 1, createdAt: -1)`, `(type: 1, createdAt: -1)` |
| 4 | `settings` (`Settings`) | `key` (String), `value` (`Mixed` — defaults: `reportFeePaise: 500`, `supportFeePaise: 100`, `tier1Paise: 20000`, `tier2Paise: 50000`, `signupCreditPaise: 5000`, `duplicateRadiusM: 100`, `duplicateDays: 30`, `autoCloseDays: 7`, `socialPublishMode: 'AUTO'`, `platformCreditMaxPaise: 50000`, `disabledIssueCategories: []`, `disabledHelperCategories: []`, `demoMode: false`) | `unique(key)` |
| 5 | `issues` (`Issue`) | `title` (5–150 chars), `description` (20–2000 chars), `category` (8 enums: `ROAD\|GARBAGE\|WATER\|STREETLIGHT\|SEWAGE\|ELECTRICITY\|PARK\|OTHER`), `photos` (`<=3` URLs), `location` (GeoJSON Point `[lng,lat]` + `address/city/state/pincode`), `reporterId` (ref `User`), `status` (6 lifecycle states), `tier` (`0\|1\|2`), `tiersReached` (`[Number]`), `fundPaise` (`int >= 0`), `platformCreditPaise` (`>= 0`), `supporterCount` (`>= 0`), `viewsCount`, `resolvedAt`, `rejectedReason`, `authorityId` (ref `Authority`), `tier1ReachedAt`, `tier2ReachedAt`, `reachBySource` (`{x,fb,ig,rd,tg,wa,direct}`) | `2dsphere(location)`, `(category: 1, status: 1, createdAt: -1)`, `fundPaise: -1`, `text(title, description)`, `reporterId: 1` |
| 6 | `issuesupports` (`IssueSupport`) | `issueId` (ref `Issue`), `userId` (ref `User`), `amountPaise` (`int > 0`), `isReporter` (Boolean) | `unique(issueId: 1, userId: 1)` |
| 7 | `issueupdates` (`IssueUpdate`) | `issueId`, `fromStatus`, `toStatus`, `kind` (`STATUS\|AUTHORITY_ASSIGNED\|AUTHORITY_REPLY\|PLATFORM_CREDIT`), `authorityId`, `amountPaise`, `idempotencyKey`, `actorId`, `actorRole` (`CITIZEN\|HELPER\|ADMIN\|SYSTEM`), `note` (`<=500`), `updatedAt: false` | `(issueId: 1, createdAt: 1)`, partial `unique(idempotencyKey)` where `$type: 'string'` |
| 8 | `issueflags` (`IssueFlag`) | `issueId`, `userId`, `reason` (`SPAM\|DUPLICATE\|INAPPROPRIATE\|WRONG_LOCATION\|OTHER`), `comment` (`<=300`), `dismissed` (`false`), `updatedAt: false` | `unique(issueId: 1, userId: 1)`, `(issueId: 1, dismissed: 1)` |
| 9 | `authorities` (`Authority`) | `nameEn`, `nameHi`, `department`, `categories` (`[...ISSUE_CATEGORIES, '*']`), `cityKeys` (`[String]`, normalised), `email`, `handles` (`{x, facebook, instagram}`), `website`, `isActive`, `isFallback` | Separate multikey indexes `cityKeys: 1`, `categories: 1` (parallel array rule) |
| 10 | `dispatchlogs` (`DispatchLog`) | `issueId`, `tier` (`1\|2`), `channel` (`EMAIL\|N8N_WEBHOOK`), `status` (`PENDING\|SENT\|SIMULATED\|FAILED\|SKIPPED\|CANCELLED`), `reason`, `authorityId`, `to`, `subject`, `bodyText`, `bodyHtml`, `attempts`, `lastError` (`<=500`), `messageId`, `sentAt` | `unique(issueId: 1, tier: 1, channel: 1)`, `(issueId: 1, sentAt: 1)`, `(status: 1, updatedAt: 1)` |
| 11 | `socialposts` (`SocialPost`) | `issueId`, `tier` (`1\|2`), `platform` (`X\|INSTAGRAM\|FACEBOOK\|REDDIT\|WHATSAPP\|TELEGRAM`), `titleEn/Hi`, `captionEn/Hi` (`<=2500`), `imageUrl`, `generationSource` (`GEMINI\|TEMPLATE`), `status` (`GENERATED\|POSTING\|POSTED\|SIMULATED\|FAILED\|TAKEN_DOWN`), `externalId/Url`, `shareClicks`, `lastError`, `takedownReason` | `issueId: 1`, `(issueId: 1, tier: 1)`, `unique(issueId: 1, tier: 1, platform: 1)` |
| 12 | `auditlogs` (`AuditLog`) | Immutable rows (`updatedAt: false`): `action`, `issueId`, `tier`, `actorId`, `actorRole`, `fundPaiseSnapshot`, `meta`, `entity`, `entityId`, `before`, `after` (whitelisted, zero PII) | `createdAt: -1`, `(action: 1, createdAt: -1)`, `(entity: 1, entityId: 1, createdAt: -1)` |
| 13 | `helpers` (`Helper`) | `userId`, `displayName` (2–80), `photoUrl`, `phone` (`/^[6-9]\d{9}$/`, withheld from public), `categories` (1–4 of 9 `LOCAL_CATEGORIES`), `experienceYears` (0–60), `bio` (20–600), `priceHint`, `serviceLocation` (GeoJSON Point), `radiusKm` (1–25, default 5), `isAvailable`, `verificationStatus` (`PENDING\|VERIFIED\|REJECTED`), `rejectionReason`, `ratingAvg` (0–5), `ratingCount`, `connectCount`, `flagCount`, `isHidden`, `isSample` | `unique(userId)`, `2dsphere(serviceLocation)`, `(verificationStatus: 1, isHidden: 1, categories: 1)` |
| 14 | `connections` (`Connection`) | `seekerId` (ref `User`), `helperId` (ref `Helper`), `updatedAt: false` | `(seekerId: 1, helperId: 1)`, `(seekerId: 1, createdAt: 1)`, `(helperId: 1, createdAt: 1)` |
| 15 | `reviews` (`Review`) | `helperId`, `seekerId`, `rating` (int 1–5), `comment` (`<=500`) | `unique(helperId: 1, seekerId: 1)` |
| 16 | `helperflags` (`HelperFlag`) | `helperId`, `userId`, `reason` (5–300), `dismissed` (`false`), `updatedAt: false` | `unique(helperId: 1, userId: 1)` |
| 17 | `notifications` (`Notification`) | `userId`, `type` (12 enum types across Tier/Issue/Helper events), `payload` (small PII-free metadata), `dedupeKey`, `readAt`, `updatedAt: false` | `(userId: 1, readAt: 1, createdAt: -1)`, partial `unique(userId: 1, dedupeKey: 1)`, TTL `createdAt: 1` (`expireAfterSeconds: 7776000` / 90 d) |

---

## 6. Seeded Dataset Summary (Prototype Reproducible State)

- **`authorities.seed.js`:** 6 sample authorities across Bengaluru (`Roads`, `Solid Waste`), Mumbai (`Water Supply`, `Roads & Traffic`), Delhi (`Municipal Services`), plus 1 national wildcard fallback (`cityKeys: ['*'], categories: ['*'], isFallback: true`).
- **`seedHelpers.js`:** 32 sample helper accounts (`isSample: true`, phones `9000000001..32`): 30 `VERIFIED` (15 Bengaluru within ~3.3 km spread, 8 Mumbai, 7 Delhi) spanning all 9 trade categories with `radiusKm` 5–15, plus 2 `PENDING` helpers for verification queue testing.
- **`seedDemo.js`:** 12 demo citizens, 60 supporters (topped up to ₹200 = 20000 paise), **36 civic issues** (24 Bengaluru, 6 Mumbai, 6 Delhi; includes 6 native Hindi titles/descriptions) funded to exercise Tier 0 (`₹2`–`₹10`), near-threshold edge cases (`3 × ₹19`, `2 × ₹49`), Tier 1 (`6 × ₹22`), Tier 2 (`4 × ₹52`), status progression (`ACKNOWLEDGED`, `IN_PROGRESS`, `RESOLVED`, `CLOSED`, `REJECTED`), 2 platform credits, 2 authority replies, 3 issue flags, 15 helper connections, and 10 reviews — executed strictly through live service methods and gated by `guardDemoSeed()` against production execution.

---

## 7. Complete REST API Surface (`server/src/app.js`)

All JSON routes enforce Zod `validate()`, standard `{ success, data / error: { code, message } }` envelope, `express.json({ limit: '100kb' })`, `helmet()`, and exact `CLIENT_URL` CORS origin validation.

- **System & Internal:**
  - `GET /api/health` (public; reports DB state even when disconnected)
  - `POST /api/internal/jobs/:job` (`autoclose` | `dispatch-sweep`, `rateLimit 30/min`, 404 if `CRON_SECRET` unset, else `crypto.timingSafeEqual` on `X-Cron-Secret`)
  - `GET /i/:id` (public HTML Open Graph page outside `/api`, HTML-escaped metadata, crawler UA filtering, `reachBySource` increment, 404 `noindex` for `REJECTED`/missing)
- **Authentication (`/api/auth`):**
  - Public: `POST /register`, `POST /login`, `POST /refresh`
  - Protected (`authenticate`): `GET /me`, `PATCH /profile`, `POST /change-password`, `POST /switch-mode`
- **Wallet (`/api/wallet`, all `authenticate`):** `GET /`, `POST /topup`, `GET /txns`
- **Uploads (`/api/uploads`):** `POST /image` (`authenticate`, Multer `5 MB` memory image upload -> Cloudinary or `503 CLOUDINARY_NOT_CONFIGURED`)
- **Global Issues (`/api/issues`):**
  - Public / `optionalAuth`: `GET /meta`, `GET /trending`, `GET /map` (`rateLimit 60/min`, bounded viewport max `5° × 5°`, cap 300), `GET /`, `GET /:issueId`, `GET /:issueId/social`, `GET /:issueId/supporters` (`FirstName L.` only)
  - Protected (`authenticate`): `GET /mine`, `GET /mine/supported`, `POST /`, `POST /:issueId/support`, `POST /:issueId/transition`, `POST /:issueId/flag` (`rateLimit 20/min`)
- **Public Social Tracking (`/api/social`):** `GET /issues/:issueId/social`, `POST /:postId/click` (`clickRateLimit 60/min`)
- **Local Helpers (`/api/helpers`):**
  - Public / `optionalAuth`: `GET /meta`, `GET /search` (`rateLimit 100/min`, no `phone`/`address`), `GET /:helperId` (no `phone`)
  - Protected (`authenticate`): `POST /`, `GET /me/dashboard` (includes `phone`), `PATCH /me`, `GET /mine/connected`, `POST /:helperId/connect` (`rateLimit 20/min`), `POST /:helperId/review`, `POST /:helperId/flag`
- **Notifications (`/api/notifications`, `authenticate`):** `GET /` (`rateLimit 120/min`), `GET /unread-count`, `POST /read-all`, `PATCH /:id/read`
- **Admin (`/api/admin/*`, all `authenticate + requireAdmin`):**
  - Issues & Escalation: `GET /issues`, `GET /issues/:issueId`, `POST /issues/:issueId/transition`, `PATCH /issues/:issueId/authority`, `POST /issues/:issueId/authority-reply`, `POST /issues/:issueId/credit`, `POST /issues/:issueId/flags/dismiss`, `POST /issues/:issueId/recheck-tiers`
  - Helpers, Users, Settings, Audit: `GET/PATCH /helpers(/:helperId)`, `GET/PATCH /users(/:userId)`, `GET/PATCH /settings`, `GET/PATCH /categories`, `GET /dashboard`, `GET /audit`, `GET /audit/actions`
  - Authorities, Dispatch & Social: `GET/POST /authorities`, `PATCH /authorities/:id`, `GET /dispatch`, `POST /dispatch/:logId/retry`, `GET /social`, `POST /social/:postId/{publish,retry,regenerate,takedown}`, `PATCH /social/settings`

---

## 8. Core Algorithms & Invariants (Verified From Source)

1. **Atomic Idempotent Ledger (`chargeWallet`, `wallet.service.js`):** Checks `WalletTxn` by unique `idempotencyKey` before and inside a MongoDB wiredTiger session transaction; debits use conditional filter `{ userId, balancePaise: { $gte: -amountPaise } }` to guarantee `balancePaise >= 0`; concurrent duplicate keys catch Mongo `E11000` and return the winner's state cleanly.
2. **Spatial Duplicate Prevention (`findDuplicate` & `createIssue`, `issue.service.js`):** Runs after idempotent replay check (so retries never self-block) and skips only when `force === true`. Uses MongoDB `$geoNear` (`spherical: true`, `maxDistance: settings.duplicateRadiusM` [default 100 m], `category`, `status: { $nin: ['CLOSED', 'REJECTED'] }`, `createdAt >= now - duplicateDays` [30 d]). Matches return HTTP `409 DUPLICATE_FOUND` embedding `existingIssue` (`distanceM`, `canSupport`, photo preview).
3. **Race-Safe Tier Claim Engine (`checkTiers`, `tier.service.js`):** Executes **after** payment transaction commit (`createIssue`, `supportIssue`, or `platformCredit`). Loops `tier ∈ [1, 2]` with `threshold` from `getEffectiveTierThresholds()` (`demoMode`-aware). Claims atomically via `Issue.findOneAndUpdate({ _id, status: { $ne: 'REJECTED' }, fundPaise: { $gte: threshold }, tiersReached: { $ne: tier } }, { $addToSet: { tiersReached: tier }, $max: { tier }, $set: { tierNReachedAt } })`. Only the single claim winner logs `AuditLog`, matches authority via 4-step fallback (`city+cat > city+* > fallback+cat > fallback+*`), inserts deduped `DispatchLog` rows, and executes background email/n8n/social/notification side effects isolated from HTTP failure.
4. **State Machine & Rejection Refund Cascade (`transitionIssue`, `issue.service.js`):** Enforces `ALLOWED_TRANSITIONS` (`ACTIVE -> ACKNOWLEDGED|IN_PROGRESS|RESOLVED|REJECTED`, `RESOLVED -> CLOSED|ACTIVE` within `autoCloseDays`, terminal `CLOSED`/`REJECTED`) inside a transaction guarded on `{ _id, status: issue.status }`. Rejection loops over all `IssueSupport` rows to issue idempotent `REFUND` ledger credits (`REFUND:<support._id>`), zeroes `fundPaise`, cancels open `DispatchLog` entries, marks `SocialPost` `TAKEN_DOWN`, and triggers best-effort remote post deletion + notifications post-commit.
5. **Double-Radius Local Search & Connect Lock (`helper.service.js`):** Runs `$geoNear` bounded by seeker `maxDistance: radiusKm * 1000` (`2|5|10 km`) and filters `$expr: { $lte: ['$distanceM', { $multiply: ['$radiusKm', 1000] }] }` so helpers outside their own service radius never appear. Outputs strip `phone` and truncate `serviceLocation.coordinates` to 3 decimals ($\approx 110$ m precision, dropping `address`). `connectHelper` uses an in-process per-seeker promise queue (`connectLocks` `Map`), re-revealing within 24 h free of quota, and enforcing `DAILY_CONNECT_LIMIT = 10` via insert-then-count-then-rollback delete on overflow. Reviews require prior `Connection.exists`, recompute averages strictly by Mongo `$avg` aggregation, and `flagHelper` atomically auto-hides at `flagCount >= 3`.
6. **Unicode Contact Guard (`contactGuard.util.js`) & Copy Sanitizer (`sanitize.js`):** Normalizes text with NFKC, strips zero-width characters (`\u200B–\u200D`, `\u2060`, `\uFEFF`), transliterates Devanagari (`\u0966–\u096F`) and Arabic-Indic digits to ASCII before blocking 10-digit phone runs or URLs (`CONTACT_IN_TEXT`). Social copywriting strips money symbols, emails, phones, mentions, and hashtags prior to Gemini / template rendering, then re-validates output lengths (`X <= 280` chars preserving full URL).
7. **PWA & Offline Draft Resilience (`vite.config.js`, `draftStorage.js`):** Workbox precaches static shell assets while excluding `/api/` and `/i/` from `navigateFallbackDenylist` (`check-sw` CI check enforces zero `/api` URLs in precache). `ReportPage` debounces (500 ms) text/location drafts to `localStorage` with 7-day expiry, explicitly omitting photos, tokens, and idempotency keys.

---

## 9. Live Observed Verification Baseline & Honest Benchmark Placeholders

### Observed Directly in Session (`BypassSandbox: false`)
- `server` `npm run check:env`: **PASS** (`42 server + 1 client env vars all present in .env.example`).
- `server` `npm run check:secrets`: **PASS** (clean across 114 git-tracked files).
- `client` `npm test`: **PASS** (`4` test files / `18` unit tests passed in `1.55s`: `draftStorage.test.js` 5, `format.test.js` 4, `errors.test.js` 5, `geo.test.js` 4).
- `client` `npm run i18n:audit`: **PASS** (`817` English keys, `817` Hindi keys, `54` mapped error codes cleanly verified).
- `client` `npm run lint:a11y`: **PASS** (`eslint src` exited `0` cleanly).
- `client` `npm run build` & `npm run check-sw`: **PASS** (`2823` modules built in `10.30s`; PWA Workbox generated `dist/sw.js` with `43` precache entries totaling `1455.54 KiB` and zero `/api` precaches).
- **Server Integration Suite Scope (`server/src/modules/**/*.test.js` — 10 test files):** Covers wallet concurrency/idempotency, issue duplicate detection, support races, tier claim isolation/dispatch/cron, social bundling/OG views, local helper privacy/connect locks, notifications, RBAC admin flows, E2E journey, and `verifyData` integrity rules using `mongodb-memory-server` replica sets.
  - *Note on Live Server Test Execution:* Running `cd server && npm test` inside the default restricted terminal sandbox aborted at replica-set socket binding (`MongoNetworkError: connect EACCES 127.0.0.1:55195`), so exact current pass count/timing (`README.md` documents 142 tests) should be executed outside the restricted sandbox for Chapter 4 final capture.

### Required Explicit Placeholders for Chapter 4
- **UI Screenshots:** `[INSERT FIGURE 4.1]` – `[INSERT FIGURE 4.5]` (Landing bilingual page, Report Wizard + Duplicate modal, Issue Detail + Share Card PNG, Clustered Maps, Admin Analytics & Audit).
- **Live Latency Benchmarks:** `[INSERT MEASURED RESULT: Run Postman / curl over 10 runs on live local/Render API for POST /api/issues, POST /api/issues/:id/support, GET /api/issues/map, GET /api/helpers/search, and paste p50/mean ms]` + `[INSERT MEASURED RESULT: Run cd server && npm test outside sandbox and paste exact test count & duration]`.
