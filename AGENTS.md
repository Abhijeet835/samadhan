# AGENTS.md — Samadhan Project Master Instructions

## Mandatory Startup Sequence (DO THIS FIRST EVERY SESSION)
1. Read `docs/CONTEXT.md` (architecture & immutable business rules).
2. Read `docs/PROGRESS.md` (exact status of completed phases, files, and endpoints).
3. Inspect `git status` and recent commits to confirm the current workspace state.
4. Work STRICTLY on the single phase requested by the user. Never refactor finished phases.

## Project Summary
- **App:** Samadhan — intermediate-level college prototype (not production).
- **Modes:** Global (public civic problems with simulated Rs 5 report / Rs 1 +1 fund) and Local (verified nearby helpers).
- **Stack (Strict Lock):** React 18 (Vite) + Tailwind CSS + shadcn/ui + react-i18next (EN/HI) | Node.js + Express + Mongoose + Zod | MongoDB Atlas (2dsphere + transactions) | Cloudinary | Leaflet/OSM | Nodemailer | node-cron. **NO PostgreSQL, NO Docker.**

## Non-Negotiable Technical Rules
- **Module Pattern:** Every backend module under `server/src/modules/<name>` separates `routes`, `controller`, `service`, `model`, and `schema` (Zod). Put all business logic in services, never controllers.
- **Money = Integer Paise ONLY:** Rs 5 = 500, Rs 1 = 100, Rs 200 = 20000, Rs 500 = 50000. Read all fees and thresholds from the `settings` collection (never hardcode).
- **Atomic Payments:** Wallet debit + `walletTxns` row (with unique `idempotencyKey`) + issue/support write MUST execute inside one MongoDB transaction. Balance can never go below 0.
- **Race-Safe Tiers:** `checkTiers(issueId)` runs AFTER the payment transaction commits using an atomic conditional update (`tiersReached: { $ne: tier }`). Only the single winner runs Tier 1 / Tier 2 side effects.
- **State Machine:** All issue status changes (`ACTIVE -> ACKNOWLEDGED -> IN_PROGRESS -> RESOLVED -> CLOSED` or `REJECTED`) MUST go through `transitionIssue(issueId, newStatus, actor, note)`. Tier (0/1/2) is a separate field.
- **API Envelope:** Every endpoint returns `{ success: true, data }` or `{ success: false, error: { code, message } }`.
- **Bilingual (EN + HI):** Every user-facing text string must use `t('key')` via `react-i18next` with both `en.json` and `hi.json` updated in the same phase.
- **Security:** Verify JWT auth, user role, AND resource ownership on every protected route. Never commit `.env` or secrets.
- **Node Compatibility:** Ensure all packages and scripts run cleanly on Node.js v26+.

## Mandatory Shutdown Sequence (END OF EVERY PHASE)
1. Run tests and verify both client (`5173`) and server (`5000`) boot with zero errors.
2. Append a filled Phase Handoff Block to `docs/PROGRESS.md`.
3. Update `docs/API.md` with any newly added endpoints.
4. Give the user exact manual test steps to verify the phase before committing to Git.