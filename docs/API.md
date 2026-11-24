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

CORS is restricted to `CLIENT_URL` (default `http://localhost:5173`). Protected endpoints (added in later phases) require a `Bearer <JWT>` token and role/ownership checks.

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

| Field | Type | Description |
| --- | --- | --- |
| `status` | string | Always `"ok"` when the Express process can answer |
| `db` | string | Mongoose connection state: `connected`, `connecting`, `disconnecting`, `disconnected` |
| `timestamp` | string | Server time in UTC, ISO 8601 |

**Notes**

- `db` is derived from `mongoose.connection.readyState` at request time.
- A `200` response with `db: "disconnected"` is expected in Phase 0 until a valid `MONGO_URI` is supplied. It means the API is reachable but persistence is unavailable.
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

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `name` | string | Yes | Full name (2-100 chars) |
| `email` | string | Yes | Email address (must be unique) |
| `phone` | string | Yes | 10-digit Indian mobile number starting with 6-9 |
| `password` | string | Yes | Min 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special char |
| `role` | enum | No | Either `CITIZEN` or `HELPER` (default: `CITIZEN`) |
| `language` | enum | No | Either `en` or `hi` (default: `en`) |

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

## Error codes

| HTTP | Code | Meaning |
| --- | --- | --- |
| 404 | `NOT_FOUND` | No route matches the request |
| 400 | `VALIDATION_ERROR` | Zod validation failed; the message lists field paths |
| 401 | `UNAUTHORIZED` | Authentication required |
| 401 | `TOKEN_EXPIRED` | JWT token has expired |
| 401 | `INVALID_TOKEN` | JWT token is invalid |
| 401 | `INVALID_CREDENTIALS` | Wrong email or password |
| 401 | `INVALID_PASSWORD` | Current password is incorrect |
| 403 | `FORBIDDEN` | Insufficient permissions |
| 403 | `ACCOUNT_DISABLED` | User account has been disabled |
| 404 | `USER_NOT_FOUND` | User not found |
| 409 | `EMAIL_EXISTS` | Email address already registered |
| 409 | `PHONE_EXISTS` | Phone number already registered |
| 500 | `INTERNAL_SERVER_ERROR` | Unexpected server error |

Future phases add domain-specific codes such as `INSUFFICIENT_BALANCE`, `DUPLICATE_FOUND`, `INVALID_TRANSITION` and `RATE_LIMITED`. Every new endpoint must be documented here before phase handoff.
