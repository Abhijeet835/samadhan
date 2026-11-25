# Samadhan API Reference

Base URL (local): `http://localhost:5000/api`

All responses use the standard envelope.

**Success**

```json
{
  "success": true,
  "data": {}
}
```

**Failure**

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message"
  }
}
```

The failure envelope may carry extra fields alongside `code` and `message` when an error needs to return data (e.g. `error.existingIssue` on `DUPLICATE_FOUND`). Existing codes are unchanged.

CORS is restricted to `CLIENT_URL` (default `http://localhost:5173`). Protected endpoints require a `Bearer <JWT>` access token and are checked for role and resource ownership.

---

## Health

### `GET /api/health`

Public. Reports API liveness and the current MongoDB connection state. This endpoint works even when `MONGO_URI` is empty, so the client can show a live backend badge during early development.

**Request**

```http
GET /api/health
```

**Response — 200 OK (MongoDB connected)**

```json
{
  "success": true,
  "data": {
    "status": "ok",
    "db": "connected",
    "mongo": "connected",
    "uptimeSec": 12,
    "version": "0.1.0",
    "commit": null,
    "timestamp": "2026-11-24T10:30:00.000Z"
  }
}
```

**Response — 200 OK (API running, database not connected)**

```json
{
  "success": true,
  "data": {
    "status": "ok",
    "db": "disconnected",
    "mongo": "disabled",
    "uptimeSec": 3,
    "version": "0.1.0",
    "commit": null,
    "timestamp": "2026-11-24T10:30:00.000Z"
  }
}
```

**Fields**

|Field|Type|Description|
|---|---|---|
|`status`|string|Always `"ok"` when the Express process can answer|
|`db`|string|Mongoose connection state: `connected`, `connecting`, `disconnecting`, `disconnected`|
|`mongo`|string|Phase 9B: `connected` / `disconnected` / `disabled` (no MONGO_URI)|
|`uptimeSec`|number|Phase 9B: process uptime in seconds|
|`version`|string|Phase 9B: server package.json version|
|`commit`|string\|null|Phase 9B: RENDER_GIT_COMMIT or null|
|`timestamp`|string|Server time in UTC, ISO 8601|

**Notes**

- `db` is derived from `mongoose.connection.readyState` at request time.
- A `200` response with `db: "disconnected"` is expected whenever no valid `MONGO_URI` is supplied. It means the API is reachable but persistence is unavailable.
- The server logs a clear warning when `MONGO_URI` is missing and keeps running for health testing.

---

## Authentication

### `POST /api/auth/register`

Public. Register a new user account. Returns the user profile and JWT tokens.

**Request Body**

```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "9876543210",
  "password": "SecurePass@123",
  "role": "CITIZEN",
  "language": "en"
}
```

**Fields**

|Field|Type|Required|Description|
|---|---|---|---|
|`name`|string|Yes|Full name (2-100 chars)|
|`email`|string|Yes|Email address (must be unique)|
|`phone`|string|Yes|10-digit Indian mobile number starting with 6-9|
|`password`|string|Yes|Min 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special char|
|`role`|enum|No|Either `CITIZEN` or `HELPER` (default: `CITIZEN`)|
|`language`|enum|No|Either `en` or `hi` (default: `en`)|

**Response — 201 Created**

```json
{
  "success": true,
  "data": {
    "user": {
      "_id": "6b05a83eeadfead2e7d1193e",
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "9876543210",
      "role": "CITIZEN",
      "language": "en",
      "activeMode": "GLOBAL",
      "isActive": true,
      "createdAt": "2026-11-24T15:07:42.709Z",
      "updatedAt": "2026-11-24T15:07:42.709Z"
    },
    "accessToken": "eyJhbGc...",
    "refreshToken": "eyJhbGc..."
  }
}
```

**Errors**

- `409 EMAIL_EXISTS` — Email already registered
- `409 PHONE_EXISTS` — Phone number already registered
- `400 VALIDATION_ERROR` — Invalid input data

### `POST /api/auth/login`

Public. Login with email and password. Returns user profile and JWT tokens.

**Request Body**

```json
{
  "email": "john@example.com",
  "password": "SecurePass@123"
}
```

**Response — 200 OK**

```json
{
  "success": true,
  "data": {
    "user": {
      "_id": "6b05a83eeadfead2e7d1193e",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "CITIZEN",
      "activeMode": "GLOBAL",
      "lastLoginAt": "2026-11-24T15:10:00.000Z"
    },
    "accessToken": "eyJhbGc...",
    "refreshToken": "eyJhbGc..."
  }
}
```

**Errors**

- `401 INVALID_CREDENTIALS` — Wrong email or password
- `403 ACCOUNT_DISABLED` — Account has been disabled

### `POST /api/auth/refresh`

Public. Refresh access token using refresh token in Authorization header.

**Headers**

```
Authorization: Bearer <refreshToken>
```

**Response — 200 OK**

```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGc...",
    "refreshToken": "eyJhbGc..."
  }
}
```

**Errors**

- `401 UNAUTHORIZED` — Refresh token missing
- `401 TOKEN_EXPIRED` — Refresh token expired
- `401 INVALID_TOKEN` — Invalid refresh token

### `GET /api/auth/me`

Protected. Get current user profile.

**Headers**

```
Authorization: Bearer <accessToken>
```

**Response — 200 OK**

```json
{
  "success": true,
  "data": {
    "user": {
      "_id": "6b05a83eeadfead2e7d1193e",
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "9876543210",
      "role": "CITIZEN",
      "language": "en",
      "activeMode": "GLOBAL",
      "homeLocation": {
        "type": "Point",
        "coordinates": [77.5946, 12.9716],
        "address": "123 MG Road",
        "city": "Bangalore",
        "state": "Karnataka",
        "pincode": "560001"
      },
      "isActive": true,
      "createdAt": "2026-11-24T15:07:42.709Z",
      "updatedAt": "2026-11-24T15:07:42.709Z"
    }
  }
}
```

**Errors**

- `401 UNAUTHORIZED` — Not authenticated
- `404 USER_NOT_FOUND` — User not found

### `PATCH /api/auth/profile`

Protected. Update user profile.

**Headers**

```
Authorization: Bearer <accessToken>
```

**Request Body**

```json
{
  "name": "John Updated",
  "phone": "9876543211",
  "language": "hi",
  "activeMode": "LOCAL",
  "homeLocation": {
    "coordinates": [77.5946, 12.9716],
    "address": "123 MG Road",
    "city": "Bangalore",
    "state": "Karnataka",
    "pincode": "560001"
  }
}
```

All fields are optional. Only provided fields will be updated.

**Response — 200 OK**

```json
{
  "success": true,
  "data": {
    "user": { }
  }
}
```

**Errors**

- `401 UNAUTHORIZED` — Not authenticated
- `409 PHONE_EXISTS` — Phone number already in use
- `404 USER_NOT_FOUND` — User not found

### `POST /api/auth/change-password`

Protected. Change user password.

**Headers**

```
Authorization: Bearer <accessToken>
```

**Request Body**

```json
{
  "currentPassword": "OldPass@123",
  "newPassword": "NewPass@123"
}
```

**Response — 200 OK**

```json
{
  "success": true,
  "data": {
    "message": "Password changed successfully"
  }
}
```

**Errors**

- `401 UNAUTHORIZED` — Not authenticated
- `401 INVALID_PASSWORD` — Current password is incorrect
- `404 USER_NOT_FOUND` — User not found

### `POST /api/auth/switch-mode`

Protected. Switch between GLOBAL and LOCAL modes.

**Headers**

```
Authorization: Bearer <accessToken>
```

**Request Body**

```json
{
  "mode": "LOCAL"
}
```

**Response — 200 OK**

```json
{
  "success": true,
  "data": {
    "user": {
      "activeMode": "LOCAL",
      ...
    }
  }
}
```

**Errors**

- `401 UNAUTHORIZED` — Not authenticated
- `400 VALIDATION_ERROR` — Invalid mode value
- `404 USER_NOT_FOUND` — User not found

---

## Wallet (Phase 2)

All wallet endpoints are protected (`Authorization: Bearer <accessToken>`) and scoped to the logged-in user. All money values are **integer paise** (₹5 = `500`). Formatting to ₹ happens only in the UI.

Fees and thresholds live in the `settings` collection (seeded idempotently on server startup by `ensureDefaultSettings()`):

|Key|Default|Meaning|
|---|---|---|
|`reportFeePaise`|`500`|₹5 report fee (Phase 3)|
|`supportFeePaise`|`100`|₹1 support fee (Phase 4)|
|`tier1Paise`|`20000`|₹200 Spotlight threshold (Phase 5)|
|`tier2Paise`|`50000`|₹500 Escalation threshold (Phase 5)|
|`signupCreditPaise`|`5000`|₹50 signup bonus|
|`duplicateRadiusM`|`100`|Duplicate detection radius (Phase 4)|
|`duplicateDays`|`30`|Duplicate detection window (Phase 4)|
|`autoCloseDays`|`7`|Auto-close window for RESOLVED issues AND reporter reopen window (Phase 5)|
|`demoMode`|`false`|When `true`, effective Tier 1 = `2000` / Tier 2 = `5000` paise|

### `GET /api/wallet`

Protected. Returns the current wallet. If the user has no wallet yet (legacy/seeded account), one is created lazily and credited `signupCreditPaise` exactly once (`SIGNUP_CREDIT` ledger row, idempotencyKey `SIGNUP_CREDIT:<userId>`). New registrations already receive this credit at signup.

**Response — 200 OK**

```json
{
  "success": true,
  "data": {
    "wallet": {
      "balancePaise": 5000,
      "createdAt": "2026-11-24T15:07:42.709Z",
      "updatedAt": "2026-11-24T15:07:42.709Z"
    },
    "topupPacksPaise": [1000, 2000, 5000, 10000]
  }
}
```

**Errors**

- `401 UNAUTHORIZED` — Not authenticated

### `POST /api/wallet/topup`

Protected. Simulated top-up. Credits the wallet and writes a `TOPUP` ledger row inside one MongoDB transaction. The unique `idempotencyKey` guarantees a retry/double-tap with the same key never double-credits.

**Request Body**

```json
{
  "amountPaise": 2000,
  "idempotencyKey": "topup:550e8400-e29b-41d4-a716-446655440000"
}
```

**Fields**

|Field|Type|Required|Description|
|---|---|---|---|
|`amountPaise`|integer|Yes|One of `1000` / `2000` / `5000` / `10000` (₹10 / 20 / 50 / 100)|
|`idempotencyKey`|string|Yes|8–100 chars, unique per top-up intent (client generates a UUID)|

**Response — 201 Created** (first processing)

```json
{
  "success": true,
  "data": {
    "wallet": { "balancePaise": 7000 },
    "txn": {
      "_id": "6b05a83eeadfead2e7d11940",
      "userId": "6b05a83eeadfead2e7d1193e",
      "type": "TOPUP",
      "amountPaise": 2000,
      "idempotencyKey": "topup:550e8400-...",
      "createdAt": "2026-11-24T15:20:00.000Z"
    },
    "idempotent": false
  }
}
```

**Response — 200 OK** (replay of an already-processed key: `idempotent: true`, balance unchanged, no new ledger row)

**Errors**

- `401 UNAUTHORIZED` — Not authenticated
- `400 VALIDATION_ERROR` — Invalid pack amount or idempotencyKey

### `GET /api/wallet/txns`

Protected. Paginated ledger history for the logged-in user, newest first.

**Query Parameters**

|Param|Type|Default|Description|
|---|---|---|---|
|`page`|integer ≥ 1|`1`|Page number|
|`limit`|integer 1–50|`10`|Rows per page|

**Response — 200 OK**

```json
{
  "success": true,
  "data": {
    "txns": [
      {
        "_id": "6b05a83eeadfead2e7d11940",
        "userId": "6b05a83eeadfead2e7d1193e",
        "type": "TOPUP",
        "amountPaise": 2000,
        "idempotencyKey": "topup:550e8400-...",
        "createdAt": "2026-11-24T15:20:00.000Z"
      }
    ],
    "pagination": { "page": 1, "limit": 10, "total": 2, "totalPages": 1 }
  }
}
```

`type` is one of `TOPUP`, `REPORT_FEE`, `SUPPORT_FEE`, `REFUND`, `PLATFORM_CREDIT`, `SIGNUP_CREDIT`. `amountPaise` is signed: positive credits, negative debits. `issueId` is present on issue-related rows (Phases 3–4).

**Errors**

- `401 UNAUTHORIZED` — Not authenticated
- `400 VALIDATION_ERROR` — Invalid pagination params

### Internal service (not an endpoint)

`chargeWallet({ userId, type, amountPaise, issueId, idempotencyKey, session })` in `wallet.service.js` is the single atomic money primitive used by later phases (report fee, support fee, refunds). It runs inside a MongoDB transaction, enforces `balancePaise >= 0` via a conditional update (throws `409 INSUFFICIENT_BALANCE`), and honours the unique `idempotencyKey`. Callers may pass their own `session` to join a larger transaction.

---

## Issues (Phase 3)

Public civic issues in Global mode. All money fields are integer paise. The report fee is read from `settings.reportFeePaise` (never hardcoded).

**Lifecycle state machine** — every status change goes through `transitionIssue()`:

- `ACTIVE → ACKNOWLEDGED → IN_PROGRESS → RESOLVED → CLOSED`
- `REJECTED` is allowed from any non-terminal status (admin only). Rejection refunds **every** contribution atomically (one `REFUND` ledger row per `IssueSupport`, key `REFUND:<supportId>`) and zeroes `fundPaise`.
- `ACKNOWLEDGED`, `IN_PROGRESS`, `REJECTED`, `CLOSED` are **admin-only**. `RESOLVED` may be set by admin or the reporter.
- The reporter may reopen (`RESOLVED → ACTIVE`) only within 7 days of `resolvedAt`; otherwise `409 REOPEN_WINDOW_EXPIRED`.
- Until the Phase 5 lifecycle cron exists, `RESOLVED → CLOSED` is done manually by an admin. The cron will later auto-close issues 7 days after resolution.
- `status` and `tier` are separate fields. `tier` / `tiersReached` exist on the issue but are only written by the Phase 5 tier engine.

### `GET /api/issues/meta`

Public. Wizard bootstrap metadata.

```json
{
  "success": true,
  "data": { "categories": ["ROAD", "GARBAGE", "WATER", "STREETLIGHT", "SEWAGE", "ELECTRICITY", "PARK", "OTHER"], "reportFeePaise": 500, "supportFeePaise": 100, "thresholds": { "tier1Paise": 20000, "tier2Paise": 50000 }, "maxPhotos": 3 }
}
```

### `GET /api/issues`

Public. Paginated feed, newest first by default. `REJECTED` issues are always excluded from the feed.

**Query Parameters**

|Param|Type|Default|Description|
|---|---|---|---|
|`page`|integer ≥ 1|`1`|Page number|
|`limit`|integer 1–50|`12`|Issues per page|
|`category`|enum|—|Filter by issue category|
|`status`|enum (not `REJECTED`)|—|Filter by lifecycle status|
|`q`|string|—|Text search on title + description|
|`sort`|`latest` / `fund` / `supporters`|`latest`|Sort order|

**Response — 200 OK**

```json
{
  "success": true,
  "data": {
    "issues": [
      {
        "_id": "6b05b761a802b609b3f23cc0",
        "title": "Broken streetlight on MG Road",
        "description": "…",
        "category": "STREETLIGHT",
        "photos": [],
        "location": { "type": "Point", "coordinates": [77.5946, 12.9716], "city": "Bangalore" },
        "reporterId": { "_id": "…", "name": "Phase Two Tester" },
        "status": "ACTIVE",
        "tier": 0,
        "fundPaise": 500,
        "supporterCount": 1,
        "viewsCount": 3,
        "createdAt": "2026-11-24T16:12:00.000Z"
      }
    ],
    "pagination": { "page": 1, "limit": 12, "total": 1, "totalPages": 1 }
  }
}
```

**Errors** — `400 VALIDATION_ERROR` (invalid query params)

### `POST /api/issues`

Protected (any authenticated user). Creates an issue and charges the report fee **atomically in one MongoDB transaction**: issue document (status `ACTIVE`, `fundPaise = reportFeePaise`, `supporterCount = 1`) + `chargeWallet` REPORT_FEE debit + reporter `IssueSupport` row (`isReporter: true`) + initial timeline row (`null → ACTIVE`). The unique `idempotencyKey` makes retries/double-taps safe: a replay returns the original issue with `idempotent: true` and HTTP 200 (first processing is 201).

**Request Body**

```json
{
  "title": "Broken streetlight on MG Road",
  "description": "Dark stretch after 8 PM affecting commuters… (min 20 chars)",
  "category": "STREETLIGHT",
  "photos": ["https://res.cloudinary.com/…/image/upload/…jpg"],
  "location": {
    "coordinates": [77.5946, 12.9716],
    "address": "MG Road, near City Bus Stop",
    "city": "Bangalore",
    "state": "Karnataka",
    "pincode": "560001"
  },
  "idempotencyKey": "report:550e8400-e29b-41d4-a716-446655440000"
}
```

|Field|Type|Required|Description|
|---|---|---|---|
|`title`|string|Yes|5–150 chars|
|`description`|string|Yes|20–2000 chars|
|`category`|enum|Yes|One of the 8 categories from `/meta`|
|`photos`|string[]|No|Max 3 Cloudinary URLs|
|`location.coordinates`|[lng, lat]|Yes|GeoJSON point (2dsphere indexed)|
|`location.address/city/state/pincode`|string|No|pincode must be 6 digits|
|`idempotencyKey`|string|Yes|8–100 chars, unique per report intent|
|`force`|boolean|No|`true` skips duplicate detection ("This is different" flow). Default `false`|

**Errors**

- `401 UNAUTHORIZED` — Not authenticated
- `400 VALIDATION_ERROR` — Invalid body
- `409 INSUFFICIENT_BALANCE` — Wallet cannot cover the report fee (nothing is created)
- `409 DUPLICATE_FOUND` — An open issue of the same category exists within `settings.duplicateRadiusM` metres (default 100 m), reported in the last `settings.duplicateDays` days (default 30). Nothing is charged. The error carries `existingIssue`:

```json
{
  "success": false,
  "error": {
    "code": "DUPLICATE_FOUND",
    "message": "A similar issue was already reported nearby.",
    "existingIssue": {
      "_id": "…", "title": "…", "category": "GARBAGE", "status": "ACTIVE",
      "fundPaise": 600, "supporterCount": 2, "photos": ["first photo only"],
      "distanceM": 42, "createdAt": "…",
      "hasSupported": false, "isReporter": false, "canSupport": true
    }
  }
}
```

Order of checks: idempotent replay first (a retry is never blocked by its own issue), then duplicate check (skipped when `force: true`), then the atomic transaction. Known limitation: two simultaneous reports at the same spot can both pass.

### `GET /api/issues/:issueId`

Public, but sends viewer context when an `Authorization` header is present (`optionalAuth`). `REJECTED` issues are visible only to their reporter and admins.

**Response — 200 OK**

```json
{
  "success": true,
  "data": {
    "issue": { "…full issue document…" },
    "updates": [
      { "_id": "…", "fromStatus": null, "toStatus": "ACTIVE", "actorId": "…", "actorRole": "CITIZEN", "note": null, "createdAt": "…" }
    ],
    "viewer": {
      "isAuthenticated": true,
      "isReporter": true,
      "isAdmin": false,
      "hasSupported": true,
      "canSupport": true,
      "canReopen": false
    }
  }
}
```

**Errors**

- `400 VALIDATION_ERROR` — `issueId` is not a 24-hex ObjectId
- `404 ISSUE_NOT_FOUND` — Issue does not exist or is not visible to the viewer

### `GET /api/issues/trending`

Public. Returns tier≥1 issues sorted by tier descending, then by total reach, then supporterCount descending. Excludes `REJECTED` and `CLOSED` issues.

**Query Parameters**

|Param|Type|Default|Description|
|---|---|---|---|
|`page`|integer ≥ 1|`1`|Page number|
|`limit`|integer 1–50|`20`|Issues per page|
|`category`|enum|—|Filter by issue category (`ROAD`, `GARBAGE`, `WATER`, `STREETLIGHT`, `SEWAGE`, `ELECTRICITY`, `PARK`, `OTHER`)|
|`city`|string|—|Filter by city name (case-insensitive substring)|

**Response — 200 OK**

```json
{
  "success": true,
  "data": {
    "issues": [
      {
        "_id": "6b05c123…",
        "title": "Major road pothole...",
        "category": "ROAD",
        "status": "ACTIVE",
        "tier": 2,
        "fundPaise": 50000,
        "supporterCount": 496,
        "totalReach": 125,
        "photos": ["…"],
        "location": { "city": "Bengaluru" },
        "createdAt": "…"
      }
    ],
    "pagination": { "page": 1, "limit": 20, "total": 42, "totalPages": 3 }
  }
}
```

**Notes**

- `totalReach` = sum of `reachBySource` (`x`, `fb`, `ig`, `rd`, `tg`, `wa`, `direct`)
- Sort: tier DESC, totalReach DESC, supporterCount DESC

---

### `POST /api/issues/:issueId/transition`

Protected. The **only** path to change issue status. Uses a conditional update against the current status so concurrent transitions cannot corrupt the machine; writes an `IssueUpdate` timeline row in the same transaction. `REJECTED` triggers the atomic refund of all contributions.

**Request Body**

```json
{ "status": "ACKNOWLEDGED", "note": "Assigned to ward engineer" }
```

|Field|Type|Required|Description|
|---|---|---|---|
|`status`|enum|Yes|Target status|
|`note`|string|No|Max 500 chars, stored on the timeline row|

**Errors**

- `401 UNAUTHORIZED` — Not authenticated
- `400 VALIDATION_ERROR` — Invalid body or issueId
- `403 FORBIDDEN` — Role not allowed for this transition (e.g. citizen → `ACKNOWLEDGED`, admin reopen, non-reporter `RESOLVED`)
- `404 ISSUE_NOT_FOUND` — Issue does not exist
- `409 INVALID_TRANSITION` — Transition not allowed from the current status (message includes `FROM → TO`)
- `409 REOPEN_WINDOW_EXPIRED` — Reopen attempted more than 7 days after `resolvedAt`

---

## Support & activity (Phase 4)

`canSupport` rule used everywhere: authenticated AND status in `ACTIVE / ACKNOWLEDGED / IN_PROGRESS` AND not already supported (the reporter always has a support row).

### `POST /api/issues/:issueId/support`

Protected. Paid +1 in ONE MongoDB transaction: verify supportable + not already supported → debit `settings.supportFeePaise` via `chargeWallet` (caller session) → `SUPPORT_FEE` ledger row (issueId set) → `IssueSupport` row storing `amountPaise` → conditional `$inc { fundPaise, supporterCount }` guarded by the current status. After commit, Phase 5 will call `checkTiers(issueId)` here.

**Request Body**

```json
{ "idempotencyKey": "support:550e8400-e29b-41d4-a716-446655440000" }
```

**Response — 201 Created** (first processing; 200 with `idempotent: true` on replay)

```json
{
  "success": true,
  "data": {
    "support": { "_id": "…", "issueId": "…", "userId": "…", "amountPaise": 100, "isReporter": false },
    "issue": { "fundPaise": 600, "supporterCount": 2 },
    "wallet": { "balancePaise": 14900 },
    "idempotent": false,
    "tierUnlocked": []
  }
}
```

**Errors**

- `401 UNAUTHORIZED` — Not authenticated
- `400 VALIDATION_ERROR` — Missing/invalid idempotencyKey (8–100 chars) or issueId
- `404 ISSUE_NOT_FOUND` — Issue does not exist
- `409 ISSUE_NOT_SUPPORTABLE` — Status is RESOLVED / CLOSED / REJECTED (or changed concurrently)
- `409 ALREADY_SUPPORTED` — One support per user per issue; nothing charged
- `409 INSUFFICIENT_BALANCE` — Nothing created or changed
- `409 IDEMPOTENCY_KEY_CONFLICT` — Key already used by a different user or issue

Race safety: concurrent double-taps (same OR different keys) produce exactly one charge; a duplicate-key abort rolls back the debit.

### `GET /api/issues/:issueId/supporters`

Public (optionalAuth for REJECTED visibility). Paginated supporter list, privacy-safe: `displayName` is "FirstName L." — never email or phone. REJECTED issues follow the detail visibility rule (reporter/admin only).

**Query** — `page` (≥1, default 1), `limit` (1–50, default 20).

```json
{
  "success": true,
  "data": {
    "supporters": [
      { "displayName": "Asha V.", "supportedAt": "2026-11-24T16:41:45.426Z", "isReporter": true }
    ],
    "pagination": { "page": 1, "limit": 20, "total": 2, "totalPages": 1 }
  }
}
```

**Errors** — `400 VALIDATION_ERROR`, `404 ISSUE_NOT_FOUND`

### `GET /api/issues/mine`

Protected. Issues I reported, newest first, paginated (`page`, `limit` 1–50 default 20). Includes REJECTED — reporters may see their own rejected issues. Registered before `/:issueId` so the param route never swallows it.

**Response** — `{ issues: [ { _id, title, category, status, fundPaise, supporterCount, photos, createdAt } ], pagination }`

**Errors** — `401 UNAUTHORIZED`

### `GET /api/issues/mine/supported`

Protected. Issues I supported (including my own reports), newest first, paginated, strictly scoped to the caller.

**Response**

```json
{
  "success": true,
  "data": {
    "supported": [
      { "issue": { "_id": "…", "title": "…", "category": "GARBAGE", "status": "ACTIVE", "fundPaise": 600, "supporterCount": 2 }, "amountPaise": 100, "supportedAt": "…", "isReporter": false }
    ],
    "pagination": { "page": 1, "limit": 20, "total": 1, "totalPages": 1 }
  }
}
```

**Errors** — `401 UNAUTHORIZED`

---

## Uploads (Phase 3)

### `POST /api/uploads/image`

Protected. Uploads one image to Cloudinary (`folder: samadhan/issues`) via multer memory storage. Returns `503 CLOUDINARY_NOT_CONFIGURED` when Cloudinary env vars are absent — the report wizard treats photos as optional and lets the user continue.

**Request** — `multipart/form-data`, field name `image`. JPEG/PNG/WebP only, max 5 MB.

**Response — 200 OK**

```json
{
  "success": true,
  "data": { "url": "https://res.cloudinary.com/<cloud>/image/upload/v…/samadhan/issues/<id>.jpg", "publicId": "samadhan/issues/<id>" }
}
```

**Errors**

- `401 UNAUTHORIZED` — Not authenticated
- `400 IMAGE_REQUIRED` — No file in the request
- `400 INVALID_IMAGE_TYPE` — Not JPEG/PNG/WebP
- `503 CLOUDINARY_NOT_CONFIGURED` — Server has no Cloudinary credentials
- `502 UPLOAD_FAILED` — Cloudinary rejected the upload

---

## Tiers, authorities & dispatch (Phase 5)

`checkTiers(issueId)` runs AFTER the report/support payment commits. Each tier is claimed with one conditional update (`fundPaise >= threshold`, `status != REJECTED`, `tiersReached != tier`); only the winner runs side effects. Thresholds come from `getEffectiveTierThresholds()` (demoMode-aware). Side effects (audit, email, webhook) are failure-isolated and never roll back a payment.

- `POST /api/issues/:issueId/support` response gains `data.tierUnlocked` — tiers claimed by THIS request (usually `[]`).
- `GET /api/issues/:issueId` gains `data.escalation`: `null` or `{ status, authorityName, sentAt }` from the tier-2 EMAIL row. NEVER the email address, subject or body. `issue.tier` / `issue.tiersReached` are included; feed items include `tier`.
- Tier 1 steps: AUDIT + N8N_WEBHOOK. Tier 2 steps: AUDIT + EMAIL + N8N_WEBHOOK. Dispatch rows are unique per `(issueId, tier, channel)`.
- Runner rule: if the issue is not ACTIVE/ACKNOWLEDGED/IN_PROGRESS at execution time, the row becomes `CANCELLED` (`ISSUE_NOT_OPEN`). Rejecting an issue cancels its PENDING/FAILED rows inside the rejection transaction (refunds unchanged).
- Lifecycle: `REJECTED` is allowed only from ACTIVE/ACKNOWLEDGED/IN_PROGRESS (admin). A `SYSTEM` actor may only do RESOLVED→CLOSED after `settings.autoCloseDays`; the reporter reopen window reads the same setting.

### `GET /api/admin/authorities` · `POST /api/admin/authorities` · `PATCH /api/admin/authorities/:id`

Admin-only (`401` without token, `403` for non-admins). Department directory used for escalation matching.

**Fields** — `nameEn`, `nameHi`, `department`, `categories` (issue categories or `'*'`), `cityKeys` (lowercase normalised strings or `'*'`), `email`, `handles { x, facebook, instagram }`, `website`, `isActive`, `isFallback`. PATCH is partial. `404 AUTHORITY_NOT_FOUND` on unknown id.

**Match priority** (isActive only): 1) same city + exact category → 2) same city + `'*'` → 3) fallback + exact category → 4) fallback + `'*'` → 5) `null` (EMAIL row then `SKIPPED` with reason `NO_AUTHORITY`). City matching normalises case/diacritics/spaces.

Seed: `npm run seed:authorities` — idempotent SAMPLE data (example.org emails, no real officials).

### `GET /api/admin/dispatch`

Admin-only. Paginated dispatch log.

**Query** — `page`, `limit` (1–50, default 20), `status` (`PENDING|SENT|SIMULATED|FAILED|SKIPPED|CANCELLED`), `issueId`.

Rows include `issueId` (populated title), `tier`, `channel` (`EMAIL|N8N_WEBHOOK`), `status`, `reason`, `to`, `subject`, `bodyText`/`bodyHtml` preview, `attempts`, `lastError` (≤500 chars), `messageId`, `sentAt`.

**Email behaviour** — `SMTP_HOST` empty → `SIMULATED` (full rendered bilingual email stored; counts as success). `DISPATCH_OVERRIDE_TO` set → real send goes to THAT address; `to` stores the intended authority recipient and the subject is prefixed `[TEST → <intended>]`. Templates are facts-only, bilingual (EN then HI), escaped HTML, include the not-an-official-portal disclaimer, and never contain reporter identity, money amounts or officer names.

**Webhook behaviour** — `N8N_WEBHOOK_URL` empty → `SKIPPED`. POST `{ event:'TIER_REACHED', tier, issue:{id,title,category,city,status,supporterCount,url}, authority:{name,handles}|null }` with optional `X-Samadhan-Secret` header, 5 s timeout. Non-2xx/timeout → `FAILED`.

### `POST /api/admin/dispatch/:logId/retry`

Admin-only. Only `FAILED` rows with `attempts < 5` are retryable; the conditional update guarantees two concurrent retries produce one send. `SENT`/`SIMULATED`/other → `409 DISPATCH_NOT_RETRYABLE`; unknown id → `404 DISPATCH_NOT_FOUND`.

### `POST /api/admin/issues/:issueId/recheck-tiers`

Admin-only. Re-runs `checkTiers` after threshold changes. Already-claimed tiers stay claimed (even if demoMode is later turned off). Response `{ claimedTiers }`.

### Lifecycle cron

`autoCloseJob` (hourly) closes RESOLVED issues older than `settings.autoCloseDays` via the SYSTEM actor; `dispatchSweepJob` (every 10 min) re-runs rows stuck PENDING > 10 min (FAILED rows are admin-retry only). Disabled when `NODE_ENV=test` or `ENABLE_CRON=false`. Manual: `npm run job:autoclose`. Demo toggles: `npm run demo:on` / `demo:off`.

---

## Local helpers (Phase 7)

FREE hyperlocal directory of admin-verified helpers — NO wallet fees. Medical help is intentionally excluded (emergencies → 112). Cab/Auto is a phone directory only. "Is a helper" = a Helper document exists for the user; `user.role` and JWT claims are unchanged. ADMIN accounts cannot register a helper profile.

**Safety guarantees:** only VERIFIED non-hidden helpers in search; phone NEVER in search/public profiles (owner dashboard/PATCH + admin only); seeker PII never exposed to helpers; reviews require a prior Connection; 3 distinct flags auto-hide.

### `GET /api/helpers/meta`

Public. `{ categories: [9 local categories], radii: [2,5,10], dailyConnectLimit: 10 }`.

### `GET /api/helpers/search`

Public, per-IP rate-limited. Query: `category` (optional), `lat`, `lng` (required), `radiusKm` (2|5|10, default 5), `sort` (nearest|rating), `page`, `limit`. `$geoNear` (spherical, key `serviceLocation`) + a `$match` enforcing the helper's own `radiusKm`; `$facet` pagination. Response `{ items, pagination }`. Items include rounded `distanceM`, displayName, photoUrl, categories, experienceYears, priceHint, isAvailable, ratingAvg, ratingCount, connectCount, serviceLocation — **never phone**.

### `POST /api/helpers`

Protected. Register ONE helper profile (unique userId → `409 HELPER_PROFILE_EXISTS`, including a duplicate-key race on parallel requests; ADMIN → `403 FORBIDDEN`). Body: displayName, phone (10-digit 6-9), categories (1–4), experienceYears, bio (20–600), priceHint, serviceLocation {coordinates, address, city, state, pincode}, radiusKm (1–25), photoUrl. Always created `PENDING`; client cannot set verification/counts. Free text with phone-like runs or URLs → `400 CONTACT_IN_TEXT` — input is normalised first (NFKC, Devanagari/Arabic-Indic digits → ASCII, zero-width chars stripped), so obfuscated numbers are caught too.

### `GET /api/helpers/me/dashboard` · `PATCH /api/helpers/me`

Protected, owner-only. No profile → `404 HELPER_PROFILE_NOT_FOUND` (client redirects to `/local/register`). Dashboard returns the profile **including phone**, stats, privacy-safe connections (`_id`, `seekerName: "FirstName L."`, `connectedAt` only; `?limit=50` supported by the client Contacts tab) and reviews. PATCH updates owner fields only; changing phone/categories/serviceLocation/displayName on a VERIFIED helper resets it to PENDING (response reflects this); comparison is normalised (coordinates rounded to 5 decimals, undefined ≡ '', categories sorted) so re-sending unchanged values never resets. A REJECTED helper changing any of those fields **or bio** is a resubmission → PENDING with `rejectionReason` cleared. isAvailable/priceHint/radiusKm/photoUrl never reset verification.

### `GET /api/helpers/mine/connected`

Protected. Deduplicated helpers the caller connected with, most recent first: `{ helper, lastConnectedAt, hasReviewed }` — never phone.

### `GET /api/helpers/:helperId`

Public + optionalAuth. Query `page`/`limit` (1–50, default 10) paginates the reviews list. Non-VERIFIED/hidden → `404 HELPER_NOT_FOUND` unless owner/admin. Returns public profile (no phone), `ratingBreakdown {1..5}`, paginated reviews (`reviewerName: "FirstName L."`), and `viewer { isAuthenticated, isOwner, hasConnected, hasFlagged, myReview }`.

### `POST /api/helpers/:helperId/connect`

Protected, per-IP rate-limited (**20 requests/minute** → `429 RATE_LIMITED`). Helper must be VERIFIED + visible (else 404); self-connect → `409 CANNOT_CONNECT_SELF`. Rolling 24 h limit of 10: a repeat connect to the same helper within 24 h re-reveals the phone with NO new row/quota/count; otherwise insert-first then count the window — over limit deletes the row and returns `429 CONNECT_LIMIT_EXCEEDED`. `connectCount` increments only on a pair's first-ever connection. Returns `{ phone, whatsappUrl, safetyNoteKey: "local.safetyNote", remainingToday, isSample }`. Sample helpers (`isSample`) return `whatsappUrl: null` (UI disables Call/WhatsApp).

### `POST /api/helpers/:helperId/review`

Protected. Requires a prior Connection (`403 CONNECTION_REQUIRED`); self-review → `409 CANNOT_REVIEW_SELF`. Body `{ rating 1–5, comment? ≤500 }` (CONTACT_IN_TEXT enforced). One editable review per pair: 201 create / 200 edit; parallel first reviews resolve via the unique index (one 201 + one 200, never a 500). `ratingAvg`/`ratingCount` recomputed by aggregation — no drift. Returns `{ review, ratingAvg, ratingCount, updated }`.

### `POST /api/helpers/:helperId/flag`

Protected. Body `{ reason 5–300 }`. Self-flag → `409 CANNOT_FLAG_SELF`; duplicate → `409 ALREADY_FLAGGED`. flagCount = non-dismissed flags; at 3 the helper is conditionally auto-hidden + `HELPER_AUTO_HIDDEN` audit. Returns `{ flagCount, isHidden }`.

### `GET /api/admin/helpers` · `PATCH /api/admin/helpers/:helperId`

Admin-only + audit before/after (snapshots carry ONLY `{verificationStatus, isHidden, rejectionReason}`). GET filters: verificationStatus, isHidden, category, pagination (rows include phone + user email — admin only). PATCH sets `verificationStatus: VERIFIED|REJECTED` (+ optional rejectionReason) or `isHidden: true|false`. Unhide dismisses existing flags and zeroes flagCount.

Seed: `npm run seed:helpers` — 30 sample VERIFIED helpers across all 9 categories and the 3 pilot cities (15 clustered within ~4 km of Bengaluru centre) + 2 PENDING; dummy phones 9000000001–32, `@example.org` emails, `isSample: true`, idempotent by email. Documented demo login: `helper1@example.org` / `Helper@12345`.

---

## Maps & notifications (Phase 8A)

### `GET /api/issues/map`

Public, rate-limited 60/min/IP. A bounded, PII-free map projection. Query: `west,south,east,north` (all-or-none floats; `west<east`, `south<north`, span ≤5° else `400 BBOX_INVALID` / `400 BBOX_TOO_LARGE`), `category`, `status` (comma list of ACTIVE|ACKNOWLEDGED|IN_PROGRESS|RESOLVED|CLOSED; default the three open statuses), `minTier` (0|1|2), `limit` (≤300, default 200). REJECTED never returned. `$geoWithin` Polygon when bbox given; sort tier desc, fundPaise desc; fetch limit+1 → `truncated`. Items: `_id,title,category,status,tier,fundPaise,supporterCount,coordinates,city,photo` (240px Cloudinary thumb). NO reporter fields. Response `{ items, count, truncated }`.

### Notifications (all protected; a user only touches own rows)

Model: `userId, type, payload (PII-free), dedupeKey?, readAt, createdAt`. Indexes `(userId,readAt,createdAt:-1)`, unique `(userId,dedupeKey)` partial on string, TTL 90 days. Types: TIER_1_REACHED, TIER_2_REACHED, ISSUE_STATUS_CHANGED, ISSUE_REJECTED, ISSUE_AUTHORITY_REPLY, ISSUE_PLATFORM_CREDIT, HELPER_VERIFIED, HELPER_REJECTED, HELPER_AUTO_HIDDEN, HELPER_UNHIDDEN, HELPER_REVERIFICATION_REQUIRED, HELPER_NEW_REVIEW, HELPER_NEW_CONNECT.

`HELPER_NEW_CONNECT` fires only on a provider's **first-ever** connect from a seeker, with masked `seekerName` and dedupe `connect:<connectionId>`; the client deep-links it to `/local/dashboard?tab=contacts`.

`notifyUsers` is failure-isolated, always after commit. Hooks: tier claim winner → reporter + supporters (dedupe `tier:<issueId>:<tier>`); transition → reporter + supporters minus actor (dedupe `status:<rowId>`), REJECTED → each payer with their own `refundPaise`; helper verify/reject/unhide/auto-hide/reverify/new-review.

- `GET /api/notifications` (rateLimit 120/min) — `page, limit≤50, unreadOnly` → `{ items, unreadCount, pagination }`
- `GET /api/notifications/unread-count` → `{ unreadCount }`
- `PATCH /api/notifications/:id/read` — idempotent; foreign/unknown → `404 NOTIFICATION_NOT_FOUND`; returns `{ unreadCount }`
- `POST /api/notifications/read-all` → `{ modifiedCount, unreadCount }` (own rows only)

### Helper public-location privacy (8A)

`searchHelpers`, public `getHelperById`, `getMyConnectedHelpers` round `serviceLocation.coordinates` to 3 decimals (≈110 m) and OMIT `address` (city/state/pincode kept). Distance still computed from exact data. Owner dashboard/PATCH and admin responses keep exact coordinates + address.

---

## Admin panel (Phase 8B)

All `/api/admin/*` routes require JWT + ADMIN role (401 no token, 403 otherwise). Every mutation writes an immutable audit row (PII-free before/after). Existing `/api/admin/authorities`, `/dispatch`, `/social`, `/helpers`, `/issues/:id/recheck-tiers` are unchanged.

### Issues moderation
- `GET /api/admin/issues` — q, status (incl. REJECTED), tier, category, city, flagged, hasFailedActions, sort (newest|fund|supporters|tier), page/limit. Items include reporter {_id,name,email}, flagCount, failedDispatch/failedSocial counts, platformCreditPaise.
- `GET /api/admin/issues/:issueId` — full issue, timeline (with kinds), contributors {count,totalPaise,top10}, dispatch rows (no bodies), social summary, flags, authority, `allowedTransitions` (from the state machine).
- `POST /api/admin/issues/:issueId/transition` {status, note} — wraps `transitionIssue`; REJECTED requires note ≥10. Refunds/takedown/notifications come from existing code.
- `PATCH /api/admin/issues/:issueId/authority` {authorityId|null} — assign/unassign an ACTIVE authority on non-terminal issues (inactive → 400). Adds AUTHORITY_ASSIGNED timeline row.
- `POST /api/admin/issues/:issueId/authority-reply` {message 10–1000, authorityId?} — AUTHORITY_REPLY timeline row (contact guard), notifies reporter+supporters. Blocked on REJECTED. Labelled "recorded by Samadhan admin".
- `POST /api/admin/issues/:issueId/credit` {amountPaise, reason 5–200, idempotencyKey} — platform credit to the fund. ONE transaction (open statuses only) + PLATFORM_CREDIT timeline row + audit. Idempotent replay 200; key reused elsewhere 409 IDEMPOTENCY_KEY_CONFLICT; amount > platformCreditMaxPaise or ≤0 → 400 INVALID_AMOUNT; terminal → 409 ISSUE_NOT_OPEN. After commit checkTiers → `tierUnlocked`. NOT a wallet txn, NOT refunded on rejection. Invariant: fundPaise = Σ supports + platformCreditPaise.
- `POST /api/admin/issues/:issueId/flags/dismiss` — dismiss all flags (+audit).

### Community flags (public)
- `POST /api/issues/:issueId/flag` {reason: SPAM|DUPLICATE|INAPPROPRIATE|WRONG_LOCATION|OTHER, comment?} — protected, rate-limited, unique (issueId,userId) → 409 ALREADY_FLAGGED, own issue → 409 CANNOT_FLAG_OWN_ISSUE, non-terminal only. NEVER auto-hides issues.

### Users
- `GET /api/admin/users` (q on name/email/phone, role, isActive) → safe fields + hasHelperProfile + walletBalancePaise (never password/tokens).
- `GET /api/admin/users/:userId` → profile + wallet + last 10 txns + counts (read-only).
- `PATCH /api/admin/users/:userId` {isActive} — only enable/disable; self/ADMIN target → 403 FORBIDDEN_TARGET; disabling hides the helper profile in the same transaction; a disabled user's token is rejected 403 ACCOUNT_DISABLED on the next request. No role editing/password reset/deletion.

### Settings & categories
- `GET /api/admin/settings` → editable keys with value/type/bounds; demo thresholds read-only; socialPublishMode linked.
- `PATCH /api/admin/settings` — whitelist + Zod bounds (reportFee/supportFee 100–10000, tier1 ≥100, tier2 > tier1, signupCredit 100–100000, duplicateRadius 10–1000, duplicateDays 1–180, autoCloseDays 1–60, platformCreditMax 100–500000, demoMode bool). Immediate effect; in-transaction audit.
- `GET/PATCH /api/admin/categories` — disabledIssueCategories[] / disabledHelperCategories[]; cannot disable OTHER or all of a list. `/issues/meta` & `/helpers/meta` return enabled only; create/register/PATCH reject disabled → 400 CATEGORY_DISABLED. Existing data stays visible.

### Dashboard & audit
- `GET /api/admin/dashboard?days=7|30|90` — users/helpers/issues/funds/simulatedRevenue (gross − refunds)/wallet/local/attention + zero-filled UTC series (issuesPerDay, feesPerDay, connectionsPerDay). Integer paise.
- `GET /api/admin/audit` (page, limit≤100, action, entity, entityId, actorId, from, to, q) → normalised rows (legacy before/after derived from meta). `GET /api/admin/audit/actions` → distinct actions. No update/delete endpoints.

---

## Internal jobs (Phase 9B)

### `POST /api/internal/jobs/:job`

`job` = `autoclose` | `dispatch-sweep`. For external cron (e.g. cron-job.org) on
sleeping free-tier hosts. **404** when `CRON_SECRET` is unset; otherwise requires
header `X-Cron-Secret` (constant-time compare, **401** on mismatch), rate-limited
30/min. Calls the SAME idempotent functions node-cron uses. Returns
`{ ran: true, affectedCount }`. node-cron remains for local/always-on use
(`ENABLE_CRON`).

---

## Phase 6 — Social Amplification

### `GET /api/issues/:issueId/social` · `GET /api/social/issues/:issueId/social`

Public. Returns non-taken-down social posts and `reachBySource` counts for a tier≥1 issue. Empty `posts` array for tier 0.

**Response — 200 OK**

```json
{
  "success": true,
  "data": {
    "posts": [
      {
        "_id": "6b05c456…",
        "platform": "X",
        "tier": 1,
        "status": "SIMULATED",
        "generationSource": "TEMPLATE",
        "captionEn": "🚨 road issue in Bengaluru…",
        "captionHi": "🚨 Bengaluru में सड़क समस्या…",
        "externalUrl": "",
        "shareClicks": 3
      }
    ],
    "reachBySource": { "x": 1, "fb": 0, "ig": 0, "rd": 0, "tg": 0, "wa": 2, "direct": 0 }
  }
}
```

**Errors**

- `400 VALIDATION_ERROR` — Invalid `issueId`
- `404 ISSUE_NOT_FOUND` — Issue missing or `REJECTED`

---

### `POST /api/social/:postId/click`

Public (IP rate-limited). Tracks a share/copy/download click and increments `SocialPost.shareClicks`.

**Response — 200 OK**

```json
{
  "success": true,
  "data": {
    "shareClicks": 4
  }
}
```

**Errors**

- `400 VALIDATION_ERROR` — Invalid `postId`
- `404 POST_NOT_FOUND`
- `410 POST_TAKEN_DOWN`
- `429 RATE_LIMITED`

---

### `GET /i/:id`

Public OG share page (mounted at root, outside `/api`). Server-rendered HTML with Open Graph and Twitter meta tags for issue `id`. Increments `issue.reachBySource[s]` (`x|fb|ig|rd|tg|wa|direct`) on non-crawler visits.

**Response — 200 OK (HTML)**

Returns full HTML page with:
- `<title>` = issue title
- `og:title`, `og:description`, `og:image`, `og:url`, `twitter:card`
- Link to the React app `/issues/:id`, active external post links, and not-official/112 disclaimer

**Response — 404 Not Found (HTML)**

For missing, invalid, or `REJECTED` issues, returns HTML with `<meta name="robots" content="noindex" />`.

**Notes**

- Crawler detection: social crawlers (`facebookexternalhit`, `whatsapp`, `twitterbot`, `telegrambot`, `redditbot`, `googlebot`, etc.) do NOT increment `reachBySource`.
- Real user visits increment `reachBySource[source]`.

---

## Admin — Social Management

All admin social endpoints require `role: ADMIN` and `Authorization: Bearer <JWT>`.

### `GET /api/admin/social`

Lists all social posts with pagination and filtering, plus current `socialPublishMode`.

**Query Parameters**

|Param|Type|Default|Description|
|---|---|---|---|
|`page`|integer ≥ 1|`1`|Page number|
|`limit`|integer 1–100|`20`|Posts per page|
|`issueId`|ObjectId|—|Filter by issue|
|`platform`|enum|—|Filter by platform (`X`, `FACEBOOK`, `INSTAGRAM`, `TELEGRAM`, `REDDIT`, `WHATSAPP`)|
|`status`|enum|—|Filter by status (`GENERATED`, `POSTING`, `POSTED`, `SIMULATED`, `FAILED`, `TAKEN_DOWN`)|
|`tier`|integer 1-2|—|Filter by tier|

**Response — 200 OK**

```json
{
  "success": true,
  "data": {
    "posts": [{ "_id": "…", "platform": "X", "status": "GENERATED", "captionEn": "…", "captionHi": "…" }],
    "pagination": { "page": 1, "limit": 20, "total": 120, "totalPages": 6 },
    "socialPublishMode": "AUTO"
  }
}
```

**Errors**

- `401 UNAUTHORIZED`
- `403 FORBIDDEN`

---

### `POST /api/admin/social/:postId/publish`

Manually publish a `GENERATED`, `SIMULATED`, or `FAILED` post. Unconfigured platforms transition to `SIMULATED`; `WHATSAPP` stays `GENERATED`; already `POSTED` is idempotent.

**Response — 200 OK**

```json
{
  "success": true,
  "data": {
    "post": { "_id": "…", "status": "POSTED", "externalId": "…", "externalUrl": "…" }
  }
}
```

**Errors**

- `409 POST_ALREADY_TAKEN_DOWN` — Cannot publish taken-down post
- `404 POST_NOT_FOUND`

---

### `POST /api/admin/social/:postId/retry`

Retry publishing a post (uses the same atomic transition as publish).

**Response — 200 OK**

Same as publish.

---

### `POST /api/admin/social/:postId/regenerate`

Regenerate copy for a `GENERATED`, `SIMULATED`, or `FAILED` post. Resets status to `GENERATED` and clears `externalId` and `externalUrl`.

**Response — 200 OK**

```json
{
  "success": true,
  "data": {
    "post": { "_id": "…", "status": "GENERATED", "captionEn": "…", "captionHi": "…" }
  }
}
```

**Errors**

- `409 POST_NOT_REGENERATABLE` — Cannot regenerate `POSTED` or `TAKEN_DOWN` posts

---

### `POST /api/admin/social/:postId/takedown`

Mark a post as `TAKEN_DOWN` and attempt best-effort remote deletion.

**Request Body**

```json
{ "reason": "Policy violation" }
```

**Response — 200 OK**

```json
{
  "success": true,
  "data": {
    "post": { "_id": "…", "status": "TAKEN_DOWN", "takedownReason": "Policy violation" }
  }
}
```

---

### `PATCH /api/admin/social/settings`

Update social publish mode.

**Request Body**

```json
{ "socialPublishMode": "AUTO" }
```

|Field|Type|Required|Description|
|---|---|---|---|
|`socialPublishMode`|enum|Yes|Either `REVIEW` or `AUTO`|

**Response — 200 OK**

```json
{
  "success": true,
  "data": { "socialPublishMode": "AUTO" }
}
```

**Notes**

- `REVIEW`: All posts stay `GENERATED`; admin must manually publish.
- `AUTO`: Posts are auto-published when tier is reached (or marked `SIMULATED` if platform credentials are unset).

---

## Error codes

|HTTP|Code|Meaning|
|---|---|---|
|404|`NOT_FOUND`|No route matches the request|
|400|`VALIDATION_ERROR`|Zod validation failed; the message lists field paths|
|401|`UNAUTHORIZED`|Authentication required|
|401|`TOKEN_EXPIRED`|JWT token has expired|
|401|`INVALID_TOKEN`|JWT token is invalid|
|401|`INVALID_CREDENTIALS`|Wrong email or password|
|401|`INVALID_PASSWORD`|Current password is incorrect|
|403|`FORBIDDEN`|Insufficient permissions|
|403|`ACCOUNT_DISABLED`|User account has been disabled|
|404|`USER_NOT_FOUND`|User not found|
|409|`EMAIL_EXISTS`|Email address already registered|
|409|`PHONE_EXISTS`|Phone number already registered|
|409|`INSUFFICIENT_BALANCE`|Wallet debit would make the balance negative|
|400|`INVALID_AMOUNT`|amountPaise is not a non-zero integer or sign mismatches the txn type|
|400|`INVALID_TXN_TYPE`|Unknown wallet transaction type|
|400|`IDEMPOTENCY_KEY_REQUIRED`|Missing idempotencyKey on a wallet charge|
|500|`SETTING_NOT_FOUND`|Settings key missing (ensureDefaultSettings not run)|
|404|`ISSUE_NOT_FOUND`|Issue does not exist or is not visible to the viewer|
|409|`DUPLICATE_FOUND`|Similar open issue nearby; error carries `existingIssue`|
|409|`ISSUE_NOT_SUPPORTABLE`|Issue status does not allow support|
|409|`ALREADY_SUPPORTED`|User already supported this issue|
|409|`IDEMPOTENCY_KEY_CONFLICT`|Key already used for a different user/issue|
|404|`AUTHORITY_NOT_FOUND`|Authority does not exist|
|404|`DISPATCH_NOT_FOUND`|Dispatch row does not exist|
|409|`DISPATCH_NOT_RETRYABLE`|Row is not FAILED or attempts exhausted|
|404|`POST_NOT_FOUND`|Social post does not exist|
|410|`POST_TAKEN_DOWN`|Social post has been taken down|
|409|`POST_ALREADY_TAKEN_DOWN`|Cannot publish taken down post|
|409|`POST_NOT_REGENERATABLE`|Cannot regenerate `POSTED` or `TAKEN_DOWN` post|
|409|`HELPER_PROFILE_EXISTS`|User already has a helper profile|
|404|`HELPER_PROFILE_NOT_FOUND`|No helper profile for this user (dashboard)|
|404|`HELPER_NOT_FOUND`|Helper missing, non-VERIFIED or hidden for this viewer|
|409|`CANNOT_CONNECT_SELF`|Cannot connect to your own helper profile|
|429|`CONNECT_LIMIT_EXCEEDED`|10 connects per rolling 24 h reached|
|403|`CONNECTION_REQUIRED`|Must connect before reviewing|
|409|`CANNOT_REVIEW_SELF`|Cannot review your own helper profile|
|409|`ALREADY_FLAGGED`|User already flagged this helper|
|409|`CANNOT_FLAG_SELF`|Cannot flag your own helper profile|
|400|`CONTACT_IN_TEXT`|Phone-like digit run or URL in free text|
|429|`RATE_LIMITED`|Per-IP request budget exhausted|
|400|`BBOX_INVALID`|Missing/invalid bounding-box edges|
|400|`BBOX_TOO_LARGE`|Bounding-box span exceeds 5°|
|404|`NOTIFICATION_NOT_FOUND`|Notification missing or owned by another user|
|400|`CATEGORY_DISABLED`|Chosen category is currently disabled|
|403|`FORBIDDEN_TARGET`|Cannot modify self or another admin|
|409|`CANNOT_FLAG_OWN_ISSUE`|Cannot flag your own issue|
|409|`ISSUE_NOT_OPEN`|Action requires a non-terminal issue|
|409|`INVALID_TRANSITION`|Status transition not allowed from the current status|
|409|`REOPEN_WINDOW_EXPIRED`|Reopen attempted more than 7 days after resolution|
|400|`IMAGE_REQUIRED`|Upload request contained no file|
|400|`INVALID_IMAGE_TYPE`|Uploaded file is not JPEG/PNG/WebP|
|502|`UPLOAD_FAILED`|Cloudinary rejected the upload|
|503|`CLOUDINARY_NOT_CONFIGURED`|Server has no Cloudinary credentials configured|
|404|`BOOKING_NOT_FOUND`|Local service booking does not exist|
|409|`CANNOT_BOOK_SELF`|Providers cannot book their own service listing|
|500|`INTERNAL_SERVER_ERROR`|Unexpected server error|

---

## v3 Overhaul Endpoints (Roles, Local Bookings + Commission, Dynamic Limits, Resolution & India States)

### Roles & Auth Normalization
- Roles are `CONSUMER`, `PROVIDER`, and `ADMIN` (legacy `CITIZEN` maps to `CONSUMER`, `HELPER` maps to `PROVIDER`).
- `POST /api/auth/register` accepts `role: "CONSUMER" | "PROVIDER"`.

### Global Mode — Dynamic Importance, Pool Funds, Resolution & India States

- **Issue categories (`ISSUE_CATEGORIES`):** `BROKEN_ROADS`, `SEWAGE_DRAINAGE`, `GARBAGE_MANAGEMENT`, `WATER_ELECTRICITY`, `STRAY_ANIMALS`, `EDUCATION_INFRA`, `PUBLIC_FACILITIES`, `OTHER` (legacy slugs accepted & normalized automatically).
- **Issue types (`issueType`):** `SOCIAL_EXPLOSION` (dynamic threshold by `importance`: `SMALL` = 5, `MEDIUM` = 15, `LARGE` = 30 from `settings`) and `POOL_FUNDS` (goal-based crowdfunding with variable `amountPaise` contributions).

#### `GET /api/issues/meta`
Public. Returns enabled `categories`, `issueTypes`, `importanceLevels`, `reportFeePaise`, `supportFeePaise`, `importanceThresholds`, `poolGoalDefaults`, and `states` (all 28 Indian States + 8 Union Territories).

#### `GET /api/issues/stats/locations?state=<optionalState>`
Public. Returns overview counts (`totalIssues`, `resolvedCount`, `thresholdReachedCount`, `socialExplosionCount`, `poolFundsCount`, `statesWithIssues`, `totalStatesAndUts: 36`), full `states` array (all 36 States & UTs with localized EN/HI names and stats), and `areas` breakdown by city/state.

#### `GET /api/issues/stats/partners`
Public. Returns NGOs, private organizations, and government departments credited for resolving issues (`organizationName`, `solverType`, `solvedCount`, `states`, promotion tagline/badge/link, and `recentIssues`).

#### `POST /api/issues/:issueId/resolve`
Protected (`reporter` or `ADMIN`). Records who solved the issue (`solverType`: `GOVERNMENT | NGO | PRIVATE_ORG | COMMUNITY`, `organizationName`, `departmentOrLead`, `resolutionDetails`, `impactSummary`, `promotion`), transitions open issues to `RESOLVED`, and logs a `RESOLUTION_RECORDED` timeline update.

#### `POST /api/issues/:issueId/utilization`
Protected (`reporter` or `ADMIN`). Appends an itemized `fundUtilization` expenditure entry (`item`, `amountPaise`, `note`) and optional `responsibleParty` details to a `POOL_FUNDS` issue.

### Local Mode — Marketplace, Nationwide Filters, Bookings & Platform Commission

- **Local categories (`LOCAL_CATEGORIES`):** `CAB_AUTO`, `GENERAL_STORE`, `GARAGE_MECHANIC`, `SWEETS_BAKERY`, `PLUMBER_ELECTRICIAN`, `APPLIANCE_REPAIR`, `OTHER_LOCAL` (NO Medical help — emergencies call 112).

#### `GET /api/helpers/search`
Public. Supports optional `lat`/`lng`/`radiusKm` (GPS nearby) OR nationwide `state`, `city`, `q`, `category`, `sort` (`nearest | rating | price_asc | bookings`) filters. Omits phone numbers and rounds coordinates publicly.

#### `POST /api/bookings`
Protected (`CONSUMER` or `PROVIDER` booking another provider). Atomically debits `amountPaise` (`BOOKING_PAYMENT` ledger row), calculates `commissionPaise` from `settings.platformCommissionPercent` (default 10%), creates booking (`status: "PENDING"`, `paymentStatus: "HELD"`), and notifies provider (`BOOKING_CREATED`). Idempotent by `idempotencyKey`.

#### `GET /api/bookings/mine` & `GET /api/bookings/provider`
Protected. Lists consumer bookings or provider booking requests + completed payout/commission summary (`completedCount`, `grossPaise`, `commissionPaise`, `netPayoutPaise`).

#### `GET /api/bookings/:bookingId`
Protected (booking consumer, provider, or `ADMIN`). Returns booking details (`404 BOOKING_NOT_FOUND`).

#### `POST /api/bookings/:bookingId/transition`
Protected.
- Consumer can transition `PENDING | ACCEPTED -> CANCELLED` (atomically refunds `BOOKING_REFUND`).
- Provider/Admin can transition `PENDING -> ACCEPTED | REJECTED` and `ACCEPTED -> IN_PROGRESS | COMPLETED | CANCELLED` and `IN_PROGRESS -> COMPLETED | CANCELLED`.
- `REJECTED` / `CANCELLED` atomically refunds `amountPaise` (`paymentStatus: "REFUNDED"`).
- `COMPLETED` atomically settles `providerPayoutPaise` (`BOOKING_PAYOUT`), increments provider `bookingCount` and `totalEarningsPaise`, and records `BOOKING_COMPLETED_COMMISSION` in `auditLogs` (surfaced in `GET /api/admin/dashboard` `data.local`).

Every new endpoint must be documented here before phase handoff.
