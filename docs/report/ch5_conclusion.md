# CHAPTER 5

## CONCLUSION AND FUTURE SCOPE

### 5.1 Summary of Work Done

Samadhan v2 handles civic issue reporting and local helper search inside one English and Hindi web app. All wallet balances, issue funds, and refunds use integer paise so payments never lose a paisa to rounding drift. Each issue also keeps its repair status separate from its escalation tier. That way, an admin status update never wipes out the support tier residents earned.

In Global Mode, checking for matching open issues within 100 meters lets neighbours add 1 rupee onto one post and keep duplicate clutter off the feed [1, 5]. Database transactions group balance checks, ledger writes, and support rows together so concurrent clicks never push a balance negative [2]. After commit, atomic tier claims run social previews, `/i/:id` share pages, and department email logs once per threshold [7], falling back to `SIMULATED` rows when external keys are empty.

In Local Mode, residents browse verified helpers across nine home trades with zero commissions and no live GPS tracking [9]. Mutual radius checks, 3-decimal public coordinate rounding, and a 10-per-24-hour Connect limit keep home addresses and mobile numbers private [3, 6]. Unicode text filtering and connection-gated reviews block hidden contact links and fake ratings [8, 10]. Automated checks passed across 18/18 frontend tests, 817 matching EN/HI keys, accessibility and secret scans, and 141/142 backend integration tests across 17 MongoDB collections.

### 5.2 Limitations and Future Improvements

Moving Samadhan v2 from a college project to public deployment needs four main upgrades:

1. Connect a real payment gateway like Razorpay or UPI using webhooks mapped to the existing `idempotencyKey` ledger, and wire helper phone numbers to real SMS OTP checks (`isPhoneVerified`).
2. Move rate limiters and 24-hour connect locks from Node memory into a shared Redis cluster so multi-instance deployments enforce the same limits.
3. Replace public OpenStreetMap tiles and 1-second throttled Nominatim lookups with self-hosted map tiles and a geocoding cache, and add Web Push notifications in place of 30-second polling.
4. Link simulated dispatch previews to live municipal APIs (such as Open311 or state portals) [2]. We also need to fix the `tier1Paise` setup in the failing `notifications.test.js` case and measure live API latency under load.
