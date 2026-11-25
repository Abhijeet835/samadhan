# Stage 3 Step 0: Proposed Report Structure & Chapter Outline (`samadhan v2`)

**Project Title (Working):** *Samadhan v2: A Bilingual Geospatial Platform for Crowdsourced Civic Issue Escalation and Verified Hyperlocal Service Discovery*
**Students:** Demo Student A (`DEMO/001/26`, CSE) & Demo Student B (`DEMO/002/26`, CSE)
**Guide:** Faculty Guide, Dept. of Computer Science and Engineering, Demo Institute, Demo City
**Formatting Constraints (`docs/Project Report Template.pdf`):** A4 (21 x 29.7 cm), 2.54 cm margins, Times New Roman, 1.5 line spacing, no paragraph indent, justified 12 pt body, 18 pt bold title, 18 pt bold italic chapters, 16 pt bold sections, 14 pt bold subsections, max 5 chapters (each on a new page), <= 30 body pages total, Abstract <= 250 words (zero citations), Acknowledgement <= 300 words.

**Planned Body Page Budget:** ~24–26 pages (leaving safety margin below the 30-page ceiling).

---

## Front Matter (`front_matter.md` — Roman Numerals i–ix)

1. **Title Page (i):** Report title, degree text (*Bachelor of Technology in Computer Science and Engineering*), both student names & roll numbers, Demo Institute emblem placeholder, institute address (Demo Engineering Institute, Demo Campus, India).
2. **Approval of the Guide (ii):** Formal endorsement block addressed to Faculty Guide, Dept. of CSE, Demo Institute.
3. **Declaration Certificate (iii):** Joint originality declaration matching template clauses (a)–(f).
4. **Certificate of Approval (iv):** Chairman (HOD) & Panel Coordinator signature block.
5. **Abstract (v):** <= 250 words summarizing problem (fragmented civic grievance tracking + unverified local service discovery), solution (`samadhan v2` dual-mode MERN architecture with `2dsphere` geospatial indexing, atomic integer-paise transactions, race-safe tier escalation, and verified local helpers), verification scope, and limitations. **Zero citations.**
6. **Acknowledgement (vi):** <= 300 words thanking Guide Faculty Guide, HOD, CSE faculty, lab staff, peers, and family.
7. **Contents / List of Figures / List of Tables (vii–ix):** Auto-generated/aligned during Stage 5 `.docx` assembly.

---

## Chapter 1: Introduction (`ch1_intro.md`, ~4 pages)

- **1.1 Background and Civic Utility Context** — Urban civic reporting challenges (siloed complaints, zero public accountability) alongside informal local repair/service discovery gaps in Indian neighbourhoods.
- **1.2 Problem Statement** — Why isolated solo ticketing fails: duplicate flood without consolidation, unverified spam submissions, lack of structured authority escalation, and phone-number exposure risks in hyperlocal listings.
- **1.3 Objectives** — Five measurable objectives tied to actual code: (1) Global pooled civic issue escalation using simulated micro-commitments, (2) 100 m geospatial duplicate prevention, (3) Atomic ACID ledger & race-safe tier triggers, (4) Free verified hyperlocal helper directory with coordinate privacy & connection-gated reviews, (5) Bilingual EN/HI mobile-first PWA accessible under spotty connectivity.
- **1.4 Scope and Prototype Constraints** — Explicit boundary between implemented prototype features (simulated paise wallet, `SIMULATED` SMTP/social fallbacks, 112 medical exclusion, OSM/Nominatim rate caching) and future production capabilities.
- **Planned Visuals:**
  - `Figure 1.1`: Dual-Mode Architecture Concept (`Global` Civic Advocacy vs. `Local` Service Discovery sharing Auth, Wallet Ledger, Geo-Indexing, Bilingual UI, and Admin Audit).
  - `Table 1.1`: Implemented Prototype Scope vs. Non-Implemented Conceptual Boundaries.

---

## Chapter 2: Literature Review (`ch2_literature.md`, ~4.5 pages)

- **2.1 Crowdsourced Civic Issue Platforms and Participation Dynamics** — Synthesizes SeeClickFix (`[1]`), mobile big-data coproduction (`[2]`), 311 socio-spatial reporting biases (`[5]`), and Sacramento transparency effects (`[7]`).
- **2.2 Spatial Crowdsourcing, Quality Control, and Submission Integrity** — Synthesizes spatial crowdsourcing taxonomy (`[3]`), fuzzy multi-criteria worker trust (`[8]`), and statistical fake-task/malicious-user defense (`[10]`).
- **2.3 Hyperlocal Service Platforms, Location Privacy, and Labor Context** — Synthesizes road-network geo-obfuscation (`[4]`), bounded-distortion differential geo-obfuscation (`[6]`), and Indian on-demand platform labor dynamics (`[9]`).
- **2.4 Comparative Gap Analysis and Design Synthesis** — Connects literature gaps directly to `samadhan v2` engineering decisions.
- **Planned Visuals:**
  - `Table 2.1`: Comparative Summary of Reviewed Literature and Architectural Resolutions in `samadhan v2` (mapping `[1]`–`[10]`).

---

## Chapter 3: Methodology (`ch3_methodology.md`, ~8.5 pages)

*Directly targets Demo Institute Rubric Items (b) Articulate Algorithms/DFDs/Code Flow and (d) Well-Annotated Dataset & Schema Descriptions.*

- **3.1 System Architecture and Layered Design** — Modular Monolith MVC-plus-Service pattern (`routes -> Zod validate -> auth/role -> controller -> service -> Mongoose model`), MongoDB Atlas replica-set session layer, Cloudinary upload proxy, `node-cron` / external cron bridge (`/api/internal/jobs/:job`), and React 18 Vite PWA client with bilingual `i18next`.
- **3.2 Database Design and Annotated Schema Dictionary** — Documents all 17 MongoDB collections, integer-paise money convention, UTC timestamps, TTL/partial/unique/2dsphere/text indexes, and the seeded dataset profile (`admin.seed`, `authorities.seed`, `seedHelpers`, `seedDemo`: 36 issues across 3 cities, 6 HINDI issues, 30 verified + 2 pending helpers, 6 sample authorities, 60 demo supporters).
- **3.3 Core Algorithms and Mathematical Formulations** — Numbered algorithmic procedures derived verbatim from source modules:
  - *Algorithm 3.1:* Atomic Idempotent Wallet Transaction (`chargeWallet` in `wallet.service.js`)
  - *Algorithm 3.2:* Geospatial Duplicate Issue Detection (`findDuplicate` via `$geoNear` + spherical proximity constraint Equation (3.1))
  - *Algorithm 3.3:* Post-Commit Race-Safe Tier Escalation & Authority Matching (`checkTiers` + `matchAuthority` 4-step priority fallback)
  - *Algorithm 3.4:* Guarded Issue Lifecycle State Machine & Rejection Refund Cascade (`transitionIssue` + `validateTransition`)
  - *Algorithm 3.5:* Double-Radius Hyperlocal Helper Matching & Connect-Before-Contact Rate-Lock (`searchHelpers` + `connectHelper` with Equation (3.2) distance bound & 3-decimal coordinate fuzzing)
  - *Algorithm 3.6:* Unicode-Normalized Anti-Contact Guard & Aggregate Review Computation (`assertNoContactInfo` + `upsertReview`)
- **3.4 API Contract, Security Controls, and Bilingual PWA Mechanics** — Standard `{ success, data / error }` envelope, JWT access/refresh split, per-IP sliding-window limiters, PII-free `AuditLog` snapshots, server-rendered `/i/:id` OG crawler routing with HTML escaping, and Workbox `NetworkOnly` `/api/*` + `/i/*` exclusions.
- **Planned Visuals & Tables:**
  - `Figure 3.1`: End-to-End `samadhan v2` System Architecture Diagram (Client PWA, Express API, MongoDB Replica Set, External Adapters & Fallbacks).
  - `Figure 3.2`: Data Flow Diagrams (DFD Level 0 Context & Level 1 Issue Escalation + Helper Connect Flows).
  - `Figure 3.3`: Global Issue Lifecycle State Transition Diagram (`ACTIVE` to terminal `CLOSED`/`REJECTED`).
  - `Table 3.1`: Annotated MongoDB Collection & Index Dictionary (all 17 collections).
  - `Table 3.2`: Seeded Prototype Dataset Summary (`seedAuthorities`, `seedHelpers`, `seedDemo`).
  - `Table 3.3`: REST API Route Groups, RBAC Guards, and Validation Contracts.

---

## Chapter 4: Experimental Results and Discussion (`ch4_results.md`, ~5 pages)

*Directly targets Demo Institute Rubric Items (c) Proper Reporting of Results Obtained and (e) Clear & Precisely Labelled Figures.*

- **4.1 Functional Module Walkthrough** — Walkthrough of Global Reporting Wizard + Duplicate Prompt, Live Fund Meter & Tier 1 Share Card PNG (`1080x1080`) / Tier 2 Escalation Email Preview, Clustered Leaflet Maps (`GlobalMap` bbox queries & `HelperAreaMap` obfuscation circle), Admin Dashboard & Audit Trail, and Bilingual EN/HI Toggle.
  - Includes explicit user-action placeholders:
    - `[INSERT FIGURE 4.1: Screenshot of Bilingual Landing Page and Mode Switcher]`
    - `[INSERT FIGURE 4.2: Screenshot of 4-Step Report Wizard and 100 m Duplicate Detection Dialog]`
    - `[INSERT FIGURE 4.3: Screenshot of Issue Detail Fund Meter, Official Campaigns Bundle, and 1080x1080 PNG Share Card]`
    - `[INSERT FIGURE 4.4: Screenshot of Clustered Leaflet Civic Map and Local Helper Approximate Service Area Map]`
    - `[INSERT FIGURE 4.5: Screenshot of Admin Dashboard KPIs, Dispatch Preview, and Diff Audit Trail]`
- **4.2 Automated Verification and Invariant Testing** — Reports verified Vitest suites (using in-memory `mongodb-memory-server` replica sets for genuine multi-document transactions, concurrency race tests, RBAC authorization matrices, and global invariant verifier `verify:data`) alongside `i18n:audit`, `check-sw`, and `lint:a11y`.
- **4.3 Performance and Build Footprint Evaluation** — Documents measured client Vite build output and test execution timing, alongside explicit benchmark table placeholders (`[INSERT MEASURED RESULT: Postman avg ms / 10 runs on GET /api/issues/map, POST /api/issues, POST /api/issues/:id/support, GET /api/helpers/search]`).
- **4.4 Engineering Challenges and Architectural Trade-offs** — Concrete implementation lessons: GeoJSON `[lng, lat]` vs. Leaflet `[lat, lng]` coordinate inversion, post-commit side-effect isolation vs. HTTP timeout UX, idempotency replay ordering ahead of spatial duplicate checks, Devanagari/zero-width obfuscation in helper profiles, and single-instance `connectLocks` memory trade-offs.
- **Planned Visuals & Tables:**
  - `Table 4.1`: Functional & Concurrency Verification Test Matrix (observed test suites & invariant checks).
  - `Table 4.2`: Measured Endpoint Response Latency & Client Quality Gate Summary (with explicit live Postman measurement placeholders).

---

## Chapter 5: Conclusion and Future Scope (`ch5_conclusion.md`, ~2 pages)

- **5.1 Summary of Implemented Outcomes** — Concise grounded wrap-up linking Chapter 1 objectives to implemented software artifacts without overclaiming unbuilt production integrations.
- **5.2 Limitations and Future Scope** — Transition path from college prototype to production readiness: real UPI/Razorpay webhook ledger reconciliation, SMS/Aadhaar-lite OTP verification for helpers, Redis shared store for rate limiters and distributed connect locks, self-hosted OSM vector tile caching, Web Push API replacing 30 s polling, and municipal Open311/CPGRAMS webhook adapters.

---

## References (`references.md`)
- Exact 10 verified numbered citations (`[1]`–`[10]`) matching Demo Institute template format.
