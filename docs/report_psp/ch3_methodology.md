# CHAPTER 3

## METHODOLOGY

### 3.1 Development Approach

The platform was built in ten incremental phases following practical software engineering stages [9, 10]. We started with Express 5 APIs and React 18 views, then added authentication and the integer-paise wallet. Later phases implemented Global issue filing, 100-meter duplicate checks, Tier 1/2 escalation, Local helper search, Leaflet maps, notifications, the admin panel, and Hindi offline drafts.

### 3.2 System Overview and User Roles

Two user modes sit on top of shared services inside one web application. Local Mode offers free discovery of admin-verified neighbourhood workers across nine trades. Global Mode supports paid civic issue reporting, `+1` community backing, bilingual social post previews, and authority dispatch. Shared modules handle authentication, MongoDB transactions, notifications, and admin audits. Table 3.1 lists the roles in the implemented codebase.

*Table 3.1: User roles and their main actions in Samadhan v2.*

| Role | Main Actions |
| :--- | :--- |
| Citizen / Seeker | Registers account, switches Global/Local mode, reports civic issues, adds Rs 1 support, searches helpers, connects for phone access (10/24h), and leaves reviews |
| Local Helper | Creates helper profile with service radius and categories, toggles availability, views distinct seeker connections, and can also participate in Global Mode |
| Administrator | Verifies or hides helpers, updates issue status, rejects spam with refunds, adds platform credit, manages authorities/settings, and views dashboard charts and audit logs |
| System Cron | Runs hourly to move expired `RESOLVED` issues to `CLOSED` after 7 days and sweeps pending dispatch jobs every 10 minutes |

### 3.3 Local Service Module

#### 3.3.1 Service Categories

Local Mode covers nine fixed categories: Plumber, Electrician, Cab/Auto Driver (phone directory only, no fare booking), House Cleaning, Locksmith, Carpenter, Painter, Packers & Movers, and Grocery Delivery. Medical services are omitted, and a persistent 112 emergency banner sits across Local screens.

#### 3.3.2 Service Flow

A user opens Local Mode, selects a trade category, and chooses a location on the map or enters an address. The server returns verified, visible helpers sorted by distance or rating. Selecting a helper opens their profile with bio, approximate service area map, and past reviews. Only logged-in users can tap Connect to view the phone number and call or message on WhatsApp (disabled for seeded sample numbers). Figure 3.1 shows this sequence.

```mermaid
fig3_1
```

*Figure 3.1: Local helper discovery, privacy masking, and Connect-before-contact flow.*

#### 3.3.3 Helper Profile and Privacy Controls

Public search results and profile responses leave out exact street addresses and phone numbers. Coordinates are rounded to three decimal places (around 110 meters) before JSON leaves the server. A text guard normalizes Unicode characters and regional numerals (such as Devanagari digits) to block phone numbers or URLs hidden inside bios, price hints, or reviews. Editing core identity fields (`phone`, `categories`, `serviceLocation`, or `displayName`) on a verified helper automatically resets status to `PENDING` for re-approval, while three distinct non-dismissed user flags auto-hide a helper for admin review.

#### 3.3.4 Nearby Search

Each helper stores an exact GeoJSON point and a personal `radiusKm` between 1 and 25 km. When a seeker searches within `R_user` (`2`, `5`, or `10` km), MongoDB runs a `$geoNear` query [11] and enforces Equation (3.1) so helpers outside their own service limit never appear.

$$\text{ShowHelper}(h, P_{\text{user}}) \iff d_{\text{geo}}(P_{\text{user}}, h.\text{location}) \le \min(R_{\text{user}}, R_{\text{helper}}) \times 1000 \tag{3.1}$$

#### 3.3.5 Connect Gate Algorithm

Algorithm 3.1 prevents phone scraping and race conditions when users tap Connect.

**Algorithm 3.1: Local Helper Connect Gate**

1. Verify that the caller is logged in, not connecting to their own helper profile, and targeting a `VERIFIED`, non-hidden helper.
2. Serialize concurrent taps from the same seeker using an in-memory promise lock (`connectLocks`).
3. Check if this seeker already connected to the same helper within the last 24 hours. If yes, return the phone number immediately without counting against the daily limit.
4. Otherwise, insert a `Connection` record, count connections for that seeker over the last 24 hours, and delete the new record plus return HTTP 429 if the count exceeds 10.
5. Increment `connectCount` once per distinct seeker and return `{ phone, whatsappUrl, safetyNoteKey }`.

### 3.4 Global Issue Module

#### 3.4.1 Issue Categories

Global Mode groups civic problems into eight categories: Roads, Garbage, Water, Streetlight, Sewage, Electricity, Parks, and Other.

#### 3.4.2 Issue Lifecycle

Every issue carries two independent fields: its repair `status` (`ACTIVE`, `ACKNOWLEDGED`, `IN_PROGRESS`, `RESOLVED`, `CLOSED`, or `REJECTED`) and its amplification `tier` (`0`, `1`, or `2`). Status updates run solely through `transitionIssue()` inside a MongoDB transaction. Figure 3.2 illustrates the full Global submission, escalation, and rejection refund flow.

```mermaid
fig3_2
```

*Figure 3.2: Global civic issue submission, tier escalation, and admin rejection refund lifecycle.*

#### 3.4.3 Duplicate Detection

Before charging a 5-rupee report fee, the server checks for active issues of the same category reported near the chosen point. Using MongoDB spherical `$geoNear` distance [11], Equation (3.2) flags a duplicate whenever an unclosed, unrejected issue sits within 100 meters and 30 days.

$$\text{IsDuplicate}(P_{\text{new}}, c) \iff d_{\text{geo}}(P_{\text{new}}, e.\text{location}) \le R_{\text{dup}} \quad \text{and} \quad (t_{\text{now}} - e.\text{createdAt}) \le W_{\text{dup}} \tag{3.2}$$

If a match turns up (and `force` is false), the API returns HTTP 409 `DUPLICATE_FOUND`. The UI then offers a 1-rupee `+1` support button so users can back the active issue without creating another ticket.

#### 3.4.4 Community Fund, Thresholds, and Wallet Algorithm

All money fields store signed or unsigned integers in paise (`100` paise = 1 rupee) so refunds never suffer float rounding drift. Equation (3.3) defines the exact fund invariant checked by our data verifier, and Table 3.2 lists the configurable tier targets read from `settings`.

$$\text{Fund}(i) = \begin{cases} 0, & \text{if } i.\text{status} = \text{REJECTED} \\ \text{Sum of user contributions for } i + \text{Platform credit}(i), & \text{otherwise} \end{cases} \tag{3.3}$$

*Table 3.2: Configured escalation tiers in standard and demo modes.*

| Tier | Standard Threshold | Demo Mode Threshold | Triggered Platform Action |
| :---: | :--- | :--- | :--- |
| Tier 1 — Spotlight | Rs 200 (`20000` paise) | Rs 20 (`2000` paise) | Unlocks 6-platform EN/HI social templates, Trending visibility, notifications, and audit log |
| Tier 2 — Escalate | Rs 500 (`50000` paise) | Rs 50 (`5000` paise) | Matches city/category department, creates email preview (or sends SMTP), and enables share appeal |

**Algorithm 3.2: Atomic Wallet Payment, Issue Save, and Tier Escalation**

1. Check `WalletTxn` for the request `idempotencyKey` first so retried requests replay the saved result without double billing or self-blocking on duplicate detection.
2. For new reports, run Equation (3.2) via `$geoNear` unless `force = true`. For `+1` support, verify the issue is open (`ACTIVE`, `ACKNOWLEDGED`, or `IN_PROGRESS`) and the user has not supported it yet.
3. Open a MongoDB replica-set transaction. Run a conditional debit requiring `balancePaise >= fee`, write the immutable `WalletTxn` entry, insert `IssueSupport`, and create or increment the `Issue` document.
4. Commit the transaction. Then call `checkTiers()` outside the transaction so slow email or webhook timeouts never roll back a completed wallet payment.
5. Claim Tier 1 or Tier 2 with one atomic `findOneAndUpdate` checking `tiersReached != tier` and `fundPaise >= threshold` so concurrent payments trigger side effects exactly once.
6. If an admin later transitions an open issue to `REJECTED` (minimum 10-character note), refund every `IssueSupport` entry atomically using `REFUND:<supportId>`, zero `fundPaise`, cancel pending dispatches, and mark social posts `TAKEN_DOWN`.

#### 3.4.5 Public Pages and Simulated Dispatch

Every Tier 1+ issue gets a public preview page at `/i/:id` with escaped Open Graph tags and click tracking (`reachBySource`). Rejected issues return `404 noindex`. Built-in English and Hindi templates generate captions across six platforms (`X`, `Instagram`, `Facebook`, `Reddit`, `WhatsApp`, `Telegram`), and users can download a `1080x1080` PNG share card from the detail page. At Tier 2, `matchAuthority()` picks the best active office by city and category; when SMTP or social credentials are empty, logs save safely as `SIMULATED`.

### 3.5 System Architecture

Figure 3.3 illustrates the four-layer architecture implemented in `client/` and `server/`. React 18 renders responsive Tailwind views with Leaflet maps and `i18next` translations. Express 5 runs `helmet`, single-origin CORS, Zod validation, JWT guards, and rate limiting over 13 modular backend services [12]. MongoDB Atlas stores all 17 collections with `2dsphere` geospatial indexes and replica-set transactions [11], alongside Cloudinary photo uploads and Nodemailer/template adapters.

```mermaid
fig3_3
```

*Figure 3.3: Implemented technical architecture of the Problem-Solving Platform (Samadhan v2).*

### 3.6 Core Data Model and Seeded Dataset

All 17 Mongoose collections store UTC timestamps and enforce structural rules via unique, compound, partial unique, `2dsphere`, and 90-day TTL indexes. Seed scripts (`authorities.seed.js`, `seedHelpers.js`, `seedDemo.js`) create reproducible sample data across Bengaluru, Mumbai, and Delhi through live service calls. Those scripts populate 6 sample offices, 32 helpers (30 verified and 2 pending), 12 reporters, 60 supporters, 36 civic issues (6 in Hindi), 15 helper connections, and 10 reviews. Table 3.3 groups the 17 collections by domain.

*Table 3.3: All 17 MongoDB collections grouped by functional domain.*

| Domain | Collections | Key Fields & Database Indexes |
| :--- | :--- | :--- |
| Accounts & Alerts | `users`, `notifications` | Roles (`CITIZEN`/`HELPER`/`ADMIN`), unique `email`, `2dsphere(homeLocation)`; 12 notification types with partial `dedupeKey` and 90-day TTL |
| Wallet & Config | `wallets`, `wallettxns`, `settings` | Non-negative `balancePaise`, signed integer `amountPaise`, unique `idempotencyKey`, dynamic fee/threshold `settings` |
| Civic Issues | `issues`, `issuesupports`, `issueupdates`, `issueflags` | `2dsphere(location)`, `fundPaise`, `platformCreditPaise`, unique `(issueId, userId)` support/flag locks, partial unique timeline keys |
| Escalation & Audit | `authorities`, `dispatchlogs`, `socialposts`, `auditlogs` | Separate `cityKeys`/`categories` multikey indexes, unique `(issueId, tier, channel)`, 6 social platforms, immutable before/after audit diffs |
| Local Directory | `helpers`, `connections`, `reviews`, `helperflags` | `2dsphere(serviceLocation)`, `radiusKm`, `verificationStatus`, `connectCount`, `ratingAvg`, unique `(helperId, seekerId)` reviews |

### 3.7 Bilingual Support, Security, and Offline Drafts

The frontend keeps 817 English and Hindi keys matched in `i18next`, updates `<html lang>`, and loads Noto Sans Devanagari for Hindi text. Protected routes verify JWT tokens, user role, active flag (`isActive`), and ownership. API secrets are masked before logging. During Vite builds, `vite-plugin-pwa` caches 43 static shell assets while excluding `/api/` and `/i/` from offline cache. Inside the report wizard, text drafts auto-save to `localStorage` for 7 days, leaving out photos and payment retry keys.
