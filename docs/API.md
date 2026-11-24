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

## Error codes

| HTTP | Code | Meaning |
| --- | --- | --- |
| 404 | `NOT_FOUND` | No route matches the request |
| 400 | `VALIDATION_ERROR` | Zod validation failed; the message lists field paths |
| 500 | `INTERNAL_SERVER_ERROR` | Unexpected server error |

Future phases add domain-specific codes such as `UNAUTHORIZED`, `FORBIDDEN`, `INSUFFICIENT_BALANCE`, `DUPLICATE_FOUND`, `INVALID_TRANSITION` and `RATE_LIMITED`. Every new endpoint must be documented here before phase handoff.
