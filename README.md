# Samadhan

A bilingual (English / Hindi), mobile-first civic-utility prototype with two modes:

- **Global Mode** — public civic problems funded by simulated ₹5 reports and ₹1 +1 supports, with ₹200 Spotlight and ₹500 Escalate tiers.
- **Local Mode** — admin-verified nearby helpers (plumber, electrician, cab, cleaning, carpentry, locksmith) with connect-before-contact privacy.

> This repository is currently at **Phase 0: foundation only**. Authentication, wallet, issues, helpers and admin features are intentionally not built yet.

## Stack

React 18 + Vite + Tailwind CSS + shadcn/ui + react-i18next · Node.js + Express + Mongoose + Zod · MongoDB Atlas.

## Run locally

### 1. Server (http://localhost:5000)

```bash
cd server
npm install
cp .env.example .env
# Optional: add your MongoDB Atlas connection string to MONGO_URI
npm run dev
```

The server boots even when `MONGO_URI` is empty. `/api/health` then reports `db: "disconnected"`, which is useful for frontend-only health testing.

### 2. Client (http://localhost:5173)

```bash
cd client
npm install
cp .env.example .env
npm run dev
```

### 3. Health check

```bash
curl http://localhost:5000/api/health
```

Expected envelope:

```json
{
  "success": true,
  "data": {
    "status": "ok",
    "db": "disconnected",
    "timestamp": "2026-11-24T00:00:00.000Z"
  }
}
```

## Documentation

- `docs/CONTEXT.md` — architecture and immutable business rules
- `docs/PROGRESS.md` — phase-by-phase handoff log
- `docs/API.md` — API reference
- `AGENTS.md` — instructions for AI coding agents

## Scripts

| Location | Command | Purpose |
| --- | --- | --- |
| `server/` | `npm run dev` | Start Express with nodemon |
| `server/` | `npm start` | Start Express with plain Node |
| `client/` | `npm run dev` | Start Vite on port 5173 |
| `client/` | `npm run build` | Production build |
| `client/` | `npm run preview` | Preview the production build |

No real money is handled. All fees and funds are simulated integer paise.
