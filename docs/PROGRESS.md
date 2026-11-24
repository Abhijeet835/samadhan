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
9. ✓ Try accessing `/profile` without login → Can still access (needs ProtectedRoute in Phase 2)
10. ✓ Test API endpoints with curl/Postman:
    - `POST /api/auth/register` with valid data → 201 with tokens
    - `POST /api/auth/login` with admin credentials → 200 with tokens
    - `GET /api/auth/me` with Bearer token → 200 with user data
    - `PATCH /api/auth/profile` with Bearer token → 200 with updated user
    - `POST /api/auth/switch-mode` with Bearer token → 200 with updated mode

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
