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
    "timestamp": "2026-11-24T10:30:00.000Z"
  }
}
```

**Fields**

|Field|Type|Description|
|---|---|---|
|`status`|string|Always `"ok"` when the Express process can answer|
|`db`|string|Mongoose connection state: `connected`, `connecting`, `disconnecting`, `disconnected`|
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
    "idempotent": false
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
|409|`INVALID_TRANSITION`|Status transition not allowed from the current status|
|409|`REOPEN_WINDOW_EXPIRED`|Reopen attempted more than 7 days after resolution|
|400|`IMAGE_REQUIRED`|Upload request contained no file|
|400|`INVALID_IMAGE_TYPE`|Uploaded file is not JPEG/PNG/WebP|
|502|`UPLOAD_FAILED`|Cloudinary rejected the upload|
|503|`CLOUDINARY_NOT_CONFIGURED`|Server has no Cloudinary credentials configured|
|500|`INTERNAL_SERVER_ERROR`|Unexpected server error|

Future phases add domain-specific codes such as `DUPLICATE_FOUND` (Phase 4) and `RATE_LIMITED` (Phase 7). Every new endpoint must be documented here before phase handoff.