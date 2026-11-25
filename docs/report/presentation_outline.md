# Samadhan v2 — 14-Slide Viva & Internship Defense Presentation Outline

**Target Audience:** B.Tech. CSE Summer Internship Evaluation Panel, Demo Engineering Institute  
**Presenters:** Demo Student A (`DEMO/001/26`, CSE) & Demo Student B (`DEMO/002/26`, CSE)  
**Guide:** Faculty Guide, Dept. of Computer Science and Engineering, Demo Institute  
**Recommended Flow:** ~12–15 minutes presentation (Slides 1–14) + optional live local walkthrough (`DEMO.md` sequence).

---

### Slide 1 — Title & Team Overview
- **Slide Bullets:**
  - **Title:** *Samadhan v2: A Bilingual Geospatial Platform for Crowdsourced Civic Issue Escalation and Verified Hyperlocal Service Discovery*
  - **Team:** Demo Student A (`DEMO/001/26`, CSE) & Demo Student B (`DEMO/002/26`, CSE)
  - **Guide:** Faculty Guide, Dept. of CSE, Demo Institute, Demo City
  - **Stack:** React 18 Vite PWA · Tailwind + Leaflet · Node/Express 5 · MongoDB Atlas Replica Set
- **Diagram / Visual Placement:** Center header banner with Demo Institute circular emblem (`docs/report/figures/institute_emblem.png`) and split Global / Local mode pill badge.
- **Speaker Notes:** Good morning, respected examiners. Our summer internship project under Faculty Guide sir addresses two everyday neighborhood bottlenecks inside one bilingual platform: fragmented civic complaints in public portals and unsafe phone-number exposure in local technician directories.
- **Examiner Viva Q&As:**
  1. *Q: Why build Global civic reporting and Local helper discovery inside a single application instead of two separate websites?*  
     A: Residents inside the same municipal ward experience both needs, and unifying them lets one JWT session, bilingual EN/HI UI shell, `2dsphere` spatial setup, and Admin `AuditLog` infrastructure serve both workflows cleanly without duplicating auth or moderation code.
  2. *Q: Why call this "v2" in the repository?*  
     A: This iteration rebuilds the architecture around strict modular Express services, integer-paise WiredTiger transactions, race-safe conditional tier claims, full EN/HI parity (`817` keys), and offline PWA draft recovery.

---

### Slide 2 — Problem Motivation & Real-World Failure Modes
- **Slide Bullets:**
  - Municipal portals isolate identical neighborhood complaints as scattered tickets without shared weight
  - Zero-cost filing invites spam noise, while raw ticket volume skews attention toward vocal wards
  - Informal local worker listings expose raw home addresses and mobile digits to scrapers
  - Commercial service apps charge steep commissions and run continuous worker tracking
- **Diagram / Visual Placement:** Two-column contrast graphic matching Section `1.2` (Left: Civic Duplication & Stalled Queues; Right: Local Discovery Safety vs. Privacy Conflict).
- **Speaker Notes:** Public civic apps often fail when twenty residents report the same pothole and create twenty isolated tickets instead of amplifying one shared case. Meanwhile, looking up an electrician or driver nearby either exposes worker phones publicly or pushes workers into high-commission tracking apps.
- **Examiner Viva Q&As:**
  1. *Q: How does pooling complaints prevent one noisy resident from spamming an issue to the top?*  
     A: A unique compound index `(issueId, userId)` inside `issuesupports` ensures each authenticated user can hold at most one support record per issue, preventing repeat clicks from inflating supporter counts.
  2. *Q: Why exclude medical services from Local Mode completely?*  
     A: A student-built unverified directory cannot safely triage medical emergencies; medical categories are blocked across schema and UI while prominent banners route users straight to India's `112` helpline.

---

### Slide 3 — Literature Review & Key Research Gaps
- **Slide Bullets:**
  - Solo power-reporters dominate SeeClickFix (`[1]`), while city dashboards suffer engagement decay (`[7]`)
  - NYC/KC 311 audits prove affluent wards over-report relative to vulnerable neighborhoods (`[5]`)
  - MINLP (`[6]`) and road-graph LP geo-obfuscation (`[4]`) add heavy latency for simple directory search
  - Indian gig-labor ethnography warns against commissions and opaque worker lockouts (`[9]`)
  - Offline anomaly detectors (`[10]`) miss Day-1 spam during cold start (`[8]`)
- **Diagram / Visual Placement:** Condense `Table 2.1` into a 4-row highlight strip (`Research Gap` -> `Samadhan v2 Resolution`, citing `[1, 2, 5, 6, 9, 10]`).
- **Speaker Notes:** Reviewing ten 2019–2024 papers across IEEE, ACM, Springer, and Elsevier shaped our backend choices. Kontokosta and Hong showed raw 311 volume reflects neighborhood wealth rather than hazard severity, so we built duplicate blocking plus admin `PLATFORM_CREDIT`. Similarly, rather than running NP-hard MINLP solvers on every helper query, we run fast server-side radius matching paired with deterministic 3-decimal output truncation.
- **Examiner Viva Q&As:**
  1. *Q: What measurable trade-off do you accept by replacing MINLP geo-obfuscation (`[6]`) with 3-decimal coordinate truncation?*  
     A: We cut query compute overhead to near-zero MongoDB indexing time while masking public pins inside roughly `110` m blocks, accepting the trade-off that repeated seeker queries always observe the same snapped grid point for a given worker.
  2. *Q: How does your system protect marginalized wards highlighted by `[5]`?*  
     A: Besides blocking 100 m duplicate floods from noisy areas, administrators can inject explicit `PLATFORM_CREDIT` ledger weights onto neglected urgent hazards, tracked publicly via `IssueUpdate`.

---

### Slide 4 — Objectives & Honest Prototype Boundaries
- **Slide Bullets:**
  - **Global Goal:** `100` m / `30`-day `$geoNear` duplicate check + pooled `₹5` report / `₹1` `+1` escalation
  - **Financial Safety:** Integer-paise WiredTiger transactions + exact atomic refunds on `REJECTED`
  - **Escalation:** Post-commit `checkTiers()` lock + `SIMULATED` email/social adapters if keys unset
  - **Local Goal:** Free 9-trade directory, `radiusKm` filtering, `10/24 h` lock, gated `$avg` reviews
  - **Prototype Bound:** Simulated wallet ledger (`₹`), in-process `connectLocks`, sample flag safeguards
- **Diagram / Visual Placement:** Compact `Table 1.1` scope comparison card (`Implemented in Code` vs. `Deferred to Production`).
- **Speaker Notes:** We anchored the internship to five verifiable goals inside the codebase while keeping prototype bounds transparent. All wallet rupees represent simulated paise inside our own ledger—not real UPI payments—and outbound authority emails or social webhooks automatically produce inspectable `SIMULATED` database logs when external API keys are absent.
- **Examiner Viva Q&As:**
  1. *Q: Why store monetary values as integer paise (`500`, `100`) instead of JavaScript floating-point rupees (`5.00`)?*  
     A: IEEE-754 floating-point arithmetic introduces binary precision errors over multi-supporter sums and refund loops; integer paise guarantees exact equality across `verifyData()` ledger checks.
  2. *Q: What prevents seeded demonstration helpers from receiving accidental phone calls or WhatsApp clicks?*  
     A: Seeded technicians set `isSample: true` with synthetic numbers (`9000000001..32`), and the frontend disables live tel/WhatsApp launch actions on sample rows.

---

### Slide 5 — System Architecture & Layered Design
- **Slide Bullets:**
  - Strict 5-stage Express 5 flow: `routes -> Zod validate -> auth/role -> controller -> service`
  - Zero database access inside controllers; all business & transaction rules live in `13` services
  - Replaceable adapters for Cloudinary (`5` MB memory stream), SMTP/n8n, Gemini `3.5-flash-lite`
  - React 18 Vite PWA client with `i18next` EN/HI bundles and Workbox shell precaching
- **Diagram / Visual Placement:** Top: `fig1_1_dual_mode.png` (tiny mode inset); Main: `fig3_1_architecture.png` (End-to-End Architecture).
- **Speaker Notes:** Figure 3.1 illustrates our modular monolith architecture. Every HTTP payload goes through `helmet()`, strict single-origin `CORS`, Zod parsing into `req.validated`, and JWT/role guards before entering domain services. Isolating business logic inside services also lets our background `node-cron` jobs (`autoClose`, `dispatchSweep`) and Vitest integration suites call identical functions directly.
- **Examiner Viva Q&As:**
  1. *Q: Why expose `/api/internal/jobs/:job` alongside in-process `node-cron`?*  
     A: Free-tier hosts like Render sleep idle web processes; triggering `/api/internal/jobs/autoclose` via an external scheduler authenticated with `crypto.timingSafeEqual` on `X-Cron-Secret` keeps scheduled sweeps reliable even after container cold starts.
  2. *Q: How do you protect external API secrets from leaking in server logs?*  
     A: Before writing audit or log entries, our logger/audit utilities swap credentials such as `bufferApiKey`, `telegramBotToken`, `uploadPostApiKey`, and Reddit secrets with `[REDACTED]`.

---

### Slide 6 — Database Design & Seeded Evaluation Profile
- **Slide Bullets:**
  - `17` Mongoose collections running on MongoDB Atlas WiredTiger replica set (`UTC` dates)
  - Separate multikey indexes on `Authority.cityKeys` and `categories` (Mongo parallel-array rule)
  - Partial unique indexes `{ $type: 'string' }` on `idempotencyKey` and `dedupeKey`; `90`-day `Notification` TTL
  - Deterministic seeding via live services (`36` issues, `32` helpers, `6` authorities, `60` supporters)
- **Diagram / Visual Placement:** Highlight summary callouts from `Table 3.1` (17 collections grouped cleanly: Civic, Local, Governance) & `Table 3.2` (3-city fixture spread: Bengaluru, Mumbai, Delhi).
- **Speaker Notes:** Our storage layer enforces integrity directly inside MongoDB rather than trusting UI state alone. Notice two non-obvious index choices: because MongoDB forbids compound indexes across two arrays, `Authority` indexes `cityKeys` and `categories` separately; meanwhile, `IssueUpdate` and `Notification` use partial unique indexes on string keys so normal `null` rows never collide.
- **Examiner Viva Q&As:**
  1. *Q: Why forbid direct `insertMany()` when seeding demonstration issues and helpers (`seedDemo.js`)?*  
     A: Populating fixtures through `createIssue()` and `supportIssue()` creates genuine `WalletTxn`, `IssueSupport`, `AuditLog`, and tier records so `verifyData()` passes identically on seeded and user-created records.
  2. *Q: What protects a production database from accidental execution of `npm run demo:reset`?*  
     A: `seedGuard.util.js` refuses to run demo seeding whenever `NODE_ENV=production` unless `ALLOW_DEMO_SEED=true` is explicitly supplied.

---

### Slide 7 — Global Mode & 100 m Spatial Duplicate Gate
- **Slide Bullets:**
  - Four-stage `ReportPage.jsx` wizard with interactive map pinning (`1.1` s Nominatim throttle)
  - `idempotencyKey` checked BEFORE spatial `$geoNear` (`100` m, `30` days) per `Algorithm 3.2`
  - Exact nearby active matches abort with `409 DUPLICATE_FOUND` (`DuplicateDialog.jsx`)
  - One-tap `₹1` (`+1`) button redirects neighbor support onto the existing ticket
- **Diagram / Visual Placement:** Main: `fig3_2_dfd.png` (Level 0 & Level 1 DFD); Side inset: `[INSERT FIGURE 4.2: Report Wizard & Duplicate Dialog]` + Equation `(3.1)`.
- **Speaker Notes:** Look closely at `Algorithm 3.2` and Equation `(3.1)`. Before charging `500` paise, we inspect `WalletTxn` for the request's UUID `idempotencyKey`, and only then run a spherical `$geoNear` check within `100` meters across the last `30` days. If a citizen clicks retry on a flaky mobile network after creating a ticket, checking idempotency first returns their created issue instead of flagging it as its own duplicate.
- **Examiner Viva Q&As:**
  1. *Q: What if a resident genuinely spots a distinct issue of the same category within `100` meters?*  
     A: `DuplicateDialog.jsx` allows overriding via `force: true` (`POST /api/issues`), charging the full `₹5` reporting fee so the override stays deliberate and spam-resistant.
  2. *Q: How do offline mobile users avoid losing long descriptions when signal drops mid-report?*  
     A: `draftStorage.js` debounces form text into a `7`-day expiring `localStorage` entry (`500` ms), intentionally excluding binary photos and authentication tokens.

---

### Slide 8 — Atomic Ledger & Race-Safe Tier Escalation
- **Slide Bullets:**
  - Single MongoDB session executes conditional `$gte` debit + `WalletTxn` + `Issue` write
  - Duplicate key `11000` on concurrent `idempotencyKey` retries aborts safely and replays winner
  - Post-commit `checkTiers()` claims Tier 1 (`₹200`/`₹20`) & Tier 2 (`₹500`/`₹50`) via `{ $ne: tier }`
  - `matchAuthority()` runs 4-step city/category fallback; Tier 1 unlocks `6`-channel copy & `/i/:id` OG
- **Diagram / Visual Placement:** Side-by-side workflow cards for `Algorithm 3.1` + `Algorithm 3.3` + `[INSERT FIGURE 4.3: Fund Meter & Share Card]`.
- **Speaker Notes:** Combining payments with escalation introduces two classic race hazards: negative overdrafts and duplicate email dispatches when ten supporters click `+1` together. First, `chargeWallet()` guarantees atomic non-negative balances using `{ balancePaise: { $gte: -amountPaise } }` inside one WiredTiger session. Second, `checkTiers()` runs strictly after commit using `findOneAndUpdate` on `tiersReached: { $ne: tier }`—so out of 20 racing threads, exactly one winner writes `DispatchLog` and triggers outreach.
- **Examiner Viva Q&As:**
  1. *Q: Why run `checkTiers()` AFTER committing the payment transaction instead of inside the same session?*  
     A: Slow external calls like Gemini generation or SMTP sockets (`10` s timeout) would hold WiredTiger database locks open or force clean wallet debits to roll back on transient email errors (`Section 4.4`).
  2. *Q: How do public share links show localized previews to WhatsApp or X bots on a React SPA?*  
     A: Requests hitting `GET /i/:id` are intercepted server-side by Express (`ogPage`), which queries the issue, escapes HTML entities cleanly, emits Open Graph metadata for crawlers, and returns `404 noindex` on `REJECTED` issues.

---

### Slide 9 — Lifecycle State Machine & Refund Cascade
- **Slide Bullets:**
  - `transitionIssue()` enforces strict role rules across `ACTIVE` -> `CLOSED` / `REJECTED`
  - Amplification `tier` (`0/1/2`) stays orthogonal so status changes never erase earned tiers
  - Rejecting (`REJECTED`, `>=10`-char note) atomically refunds every `IssueSupport` (`REFUND:<id>`)
  - Cancels pending dispatches, sets social posts `TAKEN_DOWN`, and auto-closes after `7` days
- **Diagram / Visual Placement:** Full center visual: `fig3_3_state_machine.png` (Issue Lifecycle State Machine) + key steps of `Algorithm 3.4`.
- **Speaker Notes:** Figure 3.3 shows every valid state path enforced by `validateTransition()`. Reporters can resolve active complaints or reopen `RESOLVED` issues within `autoCloseDays`, whereas only admins can mark `ACKNOWLEDGED`, `IN_PROGRESS`, or `REJECTED`. Notice the conditional database match `{ _id, status: issue.status }` guards concurrent state changes, and rejections loop cleanly over `IssueSupport` rows inside the transaction so every rupee is returned to donors.
- **Examiner Viva Q&As:**
  1. *Q: What stops two admins clicking "Reject" simultaneously from double-refunding contributors?*  
     A: Two layers block double refunds: each `chargeWallet()` refund uses unique `idempotencyKey: REFUND:<support._id>`, and the outer `Issue.findOneAndUpdate` matches `{ status: currentStatus }`, rolling back the losing session immediately with `409 INVALID_TRANSITION`.
  2. *Q: Can a rejected issue remain accessible via its `/i/:id` campaign share URL?*  
     A: No—rejection sets all `SocialPost` entries to `TAKEN_DOWN` and `GET /i/:id` returns HTTP `404` with `noindex` headers so spam tickets are suppressed completely.

---

### Slide 10 — Privacy-First Local Helper Discovery
- **Slide Bullets:**
  - Free discovery across `9` verified household trades (`PENDING -> VERIFIED` admin queue)
  - Server evaluates mutual bound `d <= min(R_seek, radiusKm) * 1000` (`Equation 3.3`)
  - Search output (`publicServiceLocation()`) strips addresses/phones and snaps coords to `3` decimals
  - `connectHelper()` enforces `withSeekerLock()` & `10/24 h` quota; reviews require `Connection.exists`
  - `assertNoContactInfo()` normalizes `NFKC`, strips zero-width chars, maps Devanagari/Arabic digits
- **Diagram / Visual Placement:** Workflow strip illustrating `Algorithm 3.5` + `[INSERT FIGURE 4.4: Clustered Map & 3-dp Circle]`.
- **Speaker Notes:** Local Mode avoids surveilling workers while blocking premature contact harvesting. Public search runs exact `$geoNear` inside MongoDB against each worker's personal `radiusKm`, then projects away phones and rounds coordinates to `3` decimal places (`≈ 110` m). Seekers unlock the helper's number only via an authenticated connection capped at `10` distinct helpers per `24` hours, and reviews fail unless a `Connection` exists and text passes our Unicode digit scrubber.
- **Examiner Viva Q&As:**
  1. *Q: Why did you write Unicode digit normalization inside `assertNoContactInfo()` instead of simple `/\d{10}/` regex?*  
     A: Spammers bypass naive ASCII regexes by inserting zero-width joiners (`\u200B`) or typing Hindi Devanagari numerals (`\u0966-\u096F`); stripping invisible characters and translating regional Unicode scripts to ASCII blocks obfuscated numbers reliably (`helpers.test.js`).
  2. *Q: How do you handle helpers changing sensitive profile fields after initial admin verification?*  
     A: `updateMyHelper()` compares normalized `displayName`, `phone`, `categories`, and `serviceLocation` (`5` decimals); changing only `isAvailable` stays instant, whereas editing identity fields resets `verificationStatus` back to `PENDING`.

---

### Slide 11 — Bilingual UI, Maps & Admin Governance
- **Slide Bullets:**
  - Complete English / Hindi parity (`817` mirrored keys), dynamic `<html lang>`, Noto Sans Devanagari
  - Off-screen `1080 x 1080` PNG advocacy cards exported via `html-to-image` (`ShareCard.jsx`)
  - Leaflet + `react-leaflet-cluster`: `500` ms `moveend` debounce, `AbortController`, max `200` pins
  - `/admin` dashboard: `7d/30d/90d` Recharts KPIs, `PLATFORM_CREDIT`, `AuditLog` diff trail
- **Diagram / Visual Placement:** 2x2 screenshot collage framing `[INSERT FIGURE 4.1]` (Bilingual Landing) & `[INSERT FIGURE 4.5]` (Admin Dashboard KPIs & Diff Audit).
- **Speaker Notes:** Accessibility across regional speakers required bilingual coverage down to validation error codes (`54` server `ApiError` keys mapped locally in `errors.js`). On the map side, debouncing `moveend` by `500` ms and aborting stale HTTP calls keeps clustered Leaflet markers responsive without hammering the backend, while administrators inspect every state change and whitelisted diff snapshot inside `/admin`.
- **Examiner Viva Q&As:**
  1. *Q: Why guard Leaflet and MongoDB coordinates behind `toLatLng()` and `toGeoJSON()` wrappers (`geo.js`)?*  
     A: MongoDB `2dsphere` expects `[longitude, latitude]`, while Leaflet expects `[latitude, longitude]`; early UI components accidentally swapped axes, placing Indian civic pins in the ocean until we centralized conversions.
  2. *Q: Does your Workbox service worker risk serving stale user balances or private helper phones offline?*  
     A: No—`vite-plugin-pwa` caches only the `43` static frontend assets (`dist/sw.js`) and explicitly excludes `/api/` and `/i/` paths, enforced automatically by `npm run check-sw`.

---

### Slide 12 — Automated Testing, Quality Gates & Build Footprint
- **Slide Bullets:**
  - **Client Observed:** `18/18` Vitest (`1.55` s), `i18n:audit` (`817` keys, `0` missing), `lint:a11y` (exit `0`), `check-sw` (`43` assets)
  - **Hygiene Observed:** `check:env` (`43` vars) & `check:secrets` (`114` tracked files) passed cleanly
  - **Server Suites:** `142` specs across `10` files (`MongoMemoryReplSet` concurrency races + `verifyData()`)
  - **Vite Build:** `2,823` modules (`10.30` s); lazy `AdminCharts` (`437` kB) & `MapShell` (`156` kB); `index-*.js` `664` kB
- **Diagram / Visual Placement:** Clean compact summary combining `Table 4.1` & `Table 4.2` (explicitly tagging `[INSERT MEASURED RESULT]` for unsandboxed backend & Postman runs).
- **Speaker Notes:** Table 4.1 distinguishes directly observed checks from unsandboxed benchmarks honestly. All client tests, localization audits, JSX accessibility lint, Workbox rules, and secret scans ran cleanly in the workspace. Our `142` backend replica-set specs verify 20-way tier races, 15-way connect caps, and overdraft protection, though running `MongoMemoryReplSet` in the sandboxed terminal hit local socket permissions and must run unsandboxed for live latency capture.
- **Examiner Viva Q&As:**
  1. *Q: Why did `index-*.js` trigger Vite's `500` kB warning (`664.37` kB raw, `188.07` kB gzip) despite lazy loading maps and charts?*  
     A: Core React 18, React Router, UI primitives, and runtime EN/HI translation payloads share the base chunk; splitting `AdminCharts` (`437` kB) and `MapShell` (`156` kB) kept heavy Recharts and Leaflet code off the landing page (`188` kB gzipped initial transfer).
  2. *Q: What invariants does `verifyData()` assert beyond ordinary unit tests?*  
     A: It audits live database records across collections: confirming every `Issue.fundPaise` equals summed `IssueSupport` rows plus `platformCreditPaise`, verifying zero negative wallets, and rejecting mismatched `ratingCount` or `REJECTED` funds.

---

### Slide 13 — Real Engineering Trade-offs & Bugs Solved
- **Slide Bullets:**
  - **Lock Isolation:** Moved `checkTiers()` post-commit so slow `10` s SMTP timeouts never stall WiredTiger
  - **Retry Ordering:** Moved `idempotencyKey` lookup ahead of `$geoNear` to prevent self-duplicate `409`
  - **Coordinate Integrity:** Unified `toLatLng()` / `toGeoJSON()` helpers eliminating `[lng, lat]` swaps
  - **Single-Node State:** Chose in-memory `connectLocks` & rate limits for zero-Redis setup clarity
- **Diagram / Visual Placement:** Crisp 4-quadrant trade-off summary (`Before Bug` -> `Architectural Fix` from `Section 4.4`).
- **Speaker Notes:** Integration testing surfaced real engineering failures that reshaped our final design. Early code ran social webhooks inside the `supportIssue()` transaction and put duplicate detection ahead of idempotency replay—both failed under realistic retry and timeout tests. Fixing transaction boundaries and retry order turned subtle concurrency bugs into deterministic behavior.
- **Examiner Viva Q&As:**
  1. *Q: What happens in production if Node crashes right AFTER committing the support payment but BEFORE post-commit `checkTiers()` completes?*  
     A: Because thresholds evaluate against persisted `fundPaise`, the next supporter request or the scheduled `dispatchSweep` job cleanly recovers pending dispatches (`RETRY_PENDING`), while `tiersReached` guards against double runs.
  2. *Q: What breaks first if you deploy two horizontal Node instances behind a load balancer right now?*  
     A: In-memory `connectLocks` and IP `rateLimit` maps live per Node process, so two concurrent clicks routed to different instances would race unless `connectLocks` moves into Redis.

---

### Slide 14 — Conclusion, Demo Sequence & Future Scope
- **Slide Bullets:**
  - Delivered all `5` goals across a verified, bilingual, race-safe civic + hyperlocal MERN prototype
  - **Demo Readiness:** `npm run demo:on` switches thresholds to `₹20 / ₹50` cleanly via `settings`
  - **Near-Term Scale:** Signed Razorpay/UPI webhooks + SMS OTP (`isPhoneVerified`) + Redis locks
  - **Civic Evolution:** Self-hosted OSM tiles, VAPID Web Push, bidirectional Open311 / CPGRAMS sync
- **Diagram / Visual Placement:** Timeline roadmap (`Academic Prototype v2` -> `Production Milestones 1..4` from `Chapter 5.2`).
- **Speaker Notes:** In summary, Samadhan v2 proves that civic issue pooling and privacy-safe neighborhood directories can share one verifiable backend without floating-point errors or intrusive tracking. Toggleable Demo Mode lets us demonstrate end-to-end Tier 1 social previews and Tier 2 dispatch in seconds using seeded cities. Going forward, integrating UPI webhooks, Redis distributed locks, self-hosted vector tiles, and Open311 adapters bridges the remaining gap to municipal production. Thank you—we welcome your questions and live demo requests.
- **Examiner Viva Q&As:**
  1. *Q: How would you integrate Razorpay or UPI webhooks without rewriting your existing ledger logic?*  
     A: Verify the payment gateway's HMAC signature inside a dedicated webhook route, then call our existing idempotent `chargeWallet()` service using the payment order ID as `idempotencyKey` (`TOPUP`).
  2. *Q: Why is bidirectional Open311 or CPGRAMS synchronization harder than outbound email dispatch?*  
     A: External civic systems manage independent status IDs, authentication tokens, and retry semantics, requiring durable webhook receivers and external ticket-ID mapping inside `DispatchLog`.
