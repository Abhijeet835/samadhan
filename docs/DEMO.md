# Samadhan — 10-minute viva / demo script

## Pre-flight (T-30 min)
```bash
cd server && npm run demo:reset      # authorities + helpers + demo data + demo mode ON + verify:data
npm run dev                          # terminal 1
cd ../client && npm run dev          # terminal 2
npm run verify:data                  # confirm PASS
```
Open **three browser windows**: Citizen A, Citizen B, Admin.

| Role | Email | Password |
| --- | --- | --- |
| Citizen A | demo.citizen1@example.org | Demo@12345 |
| Citizen B | demo.citizen2@example.org | Demo@12345 |
| Helper | helper1@example.org | Helper@12345 |
| Admin | admin@samadhan.local | Admin@12345 |

Check Hindi font renders (toggle हिंदी once). Keep a screen recording as backup.

## Timed segments
**0:00 — Problem & disclaimers (≈60 s).** Landing page. Say: civic problems need
pooled, official, tracked amplification; Local needs verified trust. Point out:
not a government portal, simulated money, 112 banner. *Fallback:* static screenshot.

**1:00 — Report with map pin + fee (≈90 s).** Citizen A → Report. Fill details,
drag the map pin (address autofills), skip photos, confirm shows −₹5 / balance /
balance-after. Pay & publish → issue detail. *If breaks:* use a pre-reported issue.

**2:30 — Duplicate detection (≈45 s).** Citizen B → Report the SAME category at the
SAME spot → duplicate dialog shows the existing issue + distance. Choose "This is
different" or Cancel. *Fallback:* explain the 100 m `$geoNear` rule.

**3:15 — Live +1 → Spotlight (≈2 min).** Open a **₹19 issue** (one +1 from Tier 1).
Citizen B taps Support ₹1 → fund crosses ₹20 → "Spotlight unlocked!" toast, social
bundle appears (Official campaigns), share card downloads. Show the share card PNG.
*Fallback:* open an already-Spotlight issue and show the bundle.

**5:15 — Tier 2 escalation (≈45 s).** Open a **₹49 issue**, add +1 → Escalation.
Admin → Dispatch → show the SIMULATED formal email preview (bilingual, facts-only).
*Fallback:* open an existing escalated issue's EscalationCard.

**6:00 — Local mode (≈90 s).** Switch to Local. Search Plumber, toggle Map view,
open a helper → Connect (demo number disabled), leave a review. Show approximate
area circle (no exact address). *Fallback:* pre-connected helper.

**7:30 — Admin (≈90 s).** Admin → Dashboard (KPIs/charts). Issues → Reject an issue
→ refunds shown. Add platform credit. Audit tab → before/after trail. *Fallback:*
read-only dashboard walkthrough.

**9:00 — Hindi + PWA + offline (≈45 s).** Toggle हिंदी (whole UI translates).
Install PWA. Go offline → report draft saved banner; reconnect → resume draft.
*Fallback:* show saved draft + install prompt screenshots.

**9:45 — Wrap-up (≈15 s).** Recap: pooled official amplification + verified local
trust, simulated & safe. Thank you.

## Backup plan
If live demo fails: play the screen recording, or walk the screenshots in
`docs/screenshots/`. Keep `verify:data` PASS output ready as proof of invariants.

## Limitations slide (say honestly)
College prototype; simulated money; sample helpers; single-instance in-memory
locks/rate-limit; OSM/Nominatim prototype usage; polling not push; not for
production scale without a shared store.

## Viva Q&A appendix
1. **Why charge fees?** Simulated commitment prevents spam; refundable on rejection; pools fund official amplification.
2. **Why integer paise?** Avoids float rounding errors in money; exact ledger sums.
3. **How does a tier fire exactly once under concurrency?** One conditional `findOneAndUpdate` whose filter includes the threshold + `tiersReached ≠ tier`; only the non-null winner runs side effects.
4. **MongoDB transactions & idempotency keys?** Payment + ledger + issue write in one transaction; unique idempotencyKey makes retries safe (replay returns the original).
5. **Why phone numbers hidden?** Connect-before-contact logs the interaction, limits 10/24 h, protects helpers; seeker phone never exposed.
6. **Helper verification?** Admin approves PENDING → VERIFIED; identity changes reset to PENDING; 3 flags auto-hide.
7. **Duplicate detection maths?** `$geoNear` spherical, same category, ≤100 m, last 30 days, not CLOSED/REJECTED; `force` overrides.
8. **Why status only through transitionIssue?** Single state machine + timeline + permission checks; prevents illegal jumps and races.
9. **Social auto-posting policy?** Facts-only, PII-free, contact-guarded; REVIEW mode holds for admin; SIMULATED when no credentials.
10. **RBAC/JWT?** JWT access+refresh; role + ownership on every protected route; admin strictly ADMIN; disabled accounts rejected.
11. **Testing strategy?** Replica-set integration tests, concurrency invariants, RBAC matrices, e2e journey, data verifier with corrupted fixtures.
12. **Scalability limits?** In-memory connect lock + rate limiter → single instance; horizontal scale needs Redis/shared store.
13. **What is simulated?** Money, top-ups, emails (when SMTP empty), social posts (when no credentials).
14. **Why bilingual?** Civic inclusion; EN+HI parity enforced by audit; Latin digits kept.
15. **How are refunds exact?** Each support stores amountPaise; rejection refunds each via REFUND txn keyed by support id.
16. **Platform credit invariant?** fundPaise = Σ supports + platformCreditPaise; credit not refunded on rejection.
17. **Why OG page on backend?** Scrapers need server-rendered meta tags; `/i/:id` escapes all values, counts reach per source.
18. **Offline support?** PWA app-shell precache; report draft autosaved to localStorage (no photos/keys); API never cached.
19. **How is PII protected in audit/social?** Per-entity whitelists; contact guard; verifier asserts no helper phone in payloads.
20. **Future work?** Real payment gateway, OTP phone verification, maps tiles host, push notifications, shared store for scale, official authority APIs.
21. **Why node-cron + internal endpoint?** Free-tier hosts sleep; external cron hits secret-guarded `/api/internal/jobs/:job` running the same idempotent functions.
22. **How do you prove data integrity?** `verify:data` checks wallet=Σtxns, fund=supports+credit, ratings=aggregate, tier audits, no PII leaks.
