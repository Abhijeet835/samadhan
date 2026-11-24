# Samadhan — Build Progress Log

> This file records what has been built. Update it at the end of every phase. `docs/CONTEXT.md` records what must remain true.

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

## Phase 1: Auth, Roles & Profile (Planned)

- [ ] User model with roles (CITIZEN, HELPER, ADMIN)
- [ ] JWT auth endpoints (register, login, refresh)
- [ ] Protected routes with auth middleware
- [ ] Profile page with language and location settings
- [ ] Mode switch (Global / Local)
- [ ] Admin seed script

---

## Phase 2: Wallet & Settings (Planned)

- [ ] Wallet and walletTxns collections
- [ ] Atomic wallet operations in MongoDB transactions
- [ ] Settings collection with configurable fees/thresholds
- [ ] Simulated top-up UI
- [ ] Wallet transaction history

---

## Phase 3: Global Report & Feed (Planned)

- [ ] Issue model with 2dsphere index
- [ ] Report wizard with photo upload (Cloudinary)
- [ ] Issue feed with filters
- [ ] Issue detail page
- [ ] Lifecycle status transitions

---

## Phase 4: Support & Duplicate Detection (Planned)

- [ ] 100m duplicate detection with geoNear
- [ ] Paid +1 support with atomic transactions
- [ ] Live fund progress meter
- [ ] Support history

---

## Phase 5: Tier Engine & Dispatch (Planned)

- [ ] Race-safe tier engine (Tier 1 @ ₹200, Tier 2 @ ₹500)
- [ ] Authority directory
- [ ] Email dispatch (SMTP + simulated preview)
- [ ] Lifecycle cron jobs
- [ ] n8n webhook integration (optional)

---

## Phase 6: Social Bundles & Trending (Planned)

- [ ] Social post generation (X, Instagram, Facebook, WhatsApp)
- [ ] Share card images
- [ ] Public OG page for issues
- [ ] Trending issues feed

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
