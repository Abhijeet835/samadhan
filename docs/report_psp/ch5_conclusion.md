# CHAPTER 5

## CONCLUSION AND FUTURE SCOPE

### 5.1 Summary of the Work

This report presented the Problem-Solving Platform implemented as Samadhan v2, a bilingual English and Hindi web application combining a free Local Services directory with a Global civic issue network. Both modes share JWT authentication, integer-paise wallet records, MongoDB `2dsphere` queries, notifications, and admin audit tools.

In Local Mode, residents browse admin-verified helpers across nine trades without commissions or live GPS tracking, protected by 3-decimal coordinate rounding, a 10-per-24-hour Connect gate, Unicode contact checks, and connection-gated reviews. In Global Mode, 100-meter duplicate screening pairs `₹5` reports with `₹1` crowd support inside MongoDB transactions. Reaching `₹200` unlocks bilingual share campaigns, while `₹500` unlocks department dispatch previews (or `₹20` and `₹50` in demo mode).

### 5.2 Main Observations

1. Enforcing integer-paise math and transaction-wrapped ledger updates prevents rounding errors and overdrafts under parallel requests.
2. Checking `idempotencyKey` replay ahead of geospatial duplicate checks keeps mobile retries safe, while running tier escalation post-commit stops mail timeouts from stalling database locks.
3. Keeping issue repair status separate from escalation tier preserves community milestones when admins update ticket progress.
4. Automated checks passed across 18/18 client tests, 817 matching EN/HI keys, and 0 security/a11y lint errors, plus 141/142 backend integration tests. Live browser captures also confirmed all five main workflows end-to-end.

### 5.3 Future Scope

1. Replace the simulated paise wallet with live Razorpay or UPI webhooks tied to `idempotencyKey`, and add SMS OTP verification for helper phone numbers.
2. Move rate limiters and daily Connect locks from Node memory into Redis so multiple backend instances share state safely.
3. Host custom OpenStreetMap vector tiles and a regional geocoding cache, and upgrade 30-second notification polling to Web Push alerts.
4. Connect simulated Tier 2 email dispatch to official grievance portals such as CPGRAMS [6] or Open311 APIs. We also plan to fix the `tier1Paise` threshold in the failing `notifications.test.js` spec, fix the landing `HealthBadge` payload check, and run live load latency tests.
