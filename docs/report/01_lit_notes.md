# Stage 2: Verified Literature Review Notes (`samadhan v2`)

All references below are verified peer-reviewed publications (2019–2024) from **IEEE**, **ACM**, **Springer**, and **Elsevier**. Notes summarize methods, datasets, key findings, and limitations in original engineering prose without copying text from abstracts or articles.

---

## 1. Thematic Notes (10 Verified Papers)

### Theme A: Crowdsourced Civic Reporting & E-Governance (4 Papers)

1. **[1] Yong, Chelmis, Lee & Zois (2019) — Multi-Neighborhood SeeClickFix Study (IEEE/ACM ASONAM '19)**
   - **Focus:** Quantitative patterns of resident civic issue reporting across contrasting urban neighborhoods on SeeClickFix.
   - **Method:** Extracted issue metadata, status logs, and textual descriptions; cleaned descriptions via unigram tokenization, punctuation/digit stripping, stopword removal, and stemming; modeled reporter frequency distributions across neighborhood types.
   - **Dataset & Context:** Geo-tagged municipal complaint logs spanning multiple urban districts (potholes, graffiti, street defects, sanitation).
   - **Key Finding:** Digital reporting relies heavily on a narrow minority of repeat "power reporters" rather than broad neighborhood participation, and platform continuity depends directly on visible municipal response cycles.
   - **Limitation:** Relies purely on digital trace logs without modeling off-platform channels, causal socioeconomic controls, or resident motivation behind participation gaps.

2. **[2] Allen, Tamindael, Bickerton & Cho (2020) — Mobile Big Data Citizen Coproduction (Elsevier *Government Information Quarterly*)**
   - **Focus:** Empirical impact of mobile e-participation and citizen feedback on public service clearance rates in smart city governance.
   - **Method:** Quantitative panel regression across subdistrict administrative units controlling for institutional variables, contrasting routine municipal tasks against multi-agency complex problems.
   - **Dataset & Context:** Longitudinal urban service request and clearance logs harvested from a large municipal mobile big-data platform across administrative subdistricts.
   - **Key Finding:** Active citizen problem reporting correlates positively with higher municipal request clearance rates, with disproportionately stronger gains on complex cross-departmental issues than simple standalone tasks.
   - **Limitation:** Anchored to a single metropolitan governance platform; effectiveness depends heavily on pre-existing municipal responsiveness and administrative capacity.

3. **[5] Kontokosta & Hong (2021) — Socio-Spatial Bias in 311 Complaint Data (Elsevier *Sustainable Cities and Society*)**
   - **Focus:** Auditing fairness distortion when municipalities allocate budgets and inspections from raw resident-submitted 311 complaint counts.
   - **Method:** Built an independent objective-need baseline using historical housing code violations, street condition audits, and building attributes; trained gradient boosting regression models to predict expected violations and contrasted them against observed 311 volumes and Census (ACS) demographics.
   - **Dataset & Context:** Millions of New York City and Kansas City 311 requests paired with Department of Buildings/HPD violation records and Census socioeconomic layers.
   - **Key Finding:** Higher-income, digitally active neighborhoods systematically over-report minor complaints, whereas underserved areas under-report genuine severe failures—creating biased feedback loops when raw ticket volume drives dispatch.
   - **Limitation:** Objective "ground truth" inspection datasets themselves carry historical inspection skews; cross-sectional demographic controls cannot capture localized community informal reporting channels.

4. **[7] Zhao, Cheng, Schiff & Kim (2023) — Digital Transparency and Citizen Participation (Elsevier *Government Information Quarterly*)**
   - **Focus:** Measuring causal effects of municipal open-data and tracking transparency on resident participation in online civic crowdsourcing.
   - **Method:** Quasi-experimental Propensity Score Matching paired with Difference-in-Differences (PSM-DID) evaluating submission rates before and after digital transparency rollouts across socioeconomic strata.
   - **Dataset & Context:** City of Sacramento 311 online crowdsourcing service request logs merged with neighborhood socioeconomic metrics.
   - **Key Finding:** Making issue statuses and public tracking dashboards visible raises citizen participation in the short term, but engagement decays over time and varies sharply by neighborhood socioeconomic capacity.
   - **Limitation:** Single-municipality natural experiment; self-selection toward digitally literate households persists without proactive offline outreach or low-friction mobile onboarding.

---

### Theme B: Spatial Crowdsourcing, Quality Control & Submission Integrity (3 Papers)

5. **[3] Tong, Zhou, Zeng, Chen & Shahabi (2020) — Spatial Crowdsourcing Survey (Springer *The VLDB Journal*)**
   - **Focus:** Systematic taxonomy of algorithms uniting physical location constraints with crowd-powered spatial task execution and urban sensing.
   - **Method:** Classifies algorithms across four coupled pillars: spatiotemporal task assignment (offline vs. online dynamic bipartite/graph matching), quality control, game-theoretic incentives, and trajectory/location privacy protection.
   - **Dataset & Context:** Synthesizes spatial crowdsourcing systems spanning ride-hailing (Uber/DiDi), participatory mapping (OpenStreetMap), and location-bound urban micro-tasks.
   - **Key Finding:** Task matching, worker trust, privacy obfuscation, and incentive design interact tightly—optimizing matching speed alone can compromise worker privacy or invite low-quality submissions.
   - **Limitation:** Highlights persistent bottlenecks in online dynamic latency, non-monetary behavioral incentives (altruism, civic commitment), and real-time privacy-preserving matching at urban scale.

6. **[8] Rahman & Abdullah (2023) — Fuzzy Trustworthiness-Aware Spatial Task Allocation (Elsevier *Expert Systems with Applications*)**
   - **Focus:** Continuous multi-criteria reputation scoring for selecting reliable workers in location-based service allocation.
   - **Method:** Replaces binary trusted/untrusted cutoffs with a Mamdani fuzzy inference system combining multiple historical reliability and reputation indicators into a continuous trust score used during spatial matching.
   - **Dataset & Context:** Evaluated on spatial crowdsourcing worker/task allocation benchmarks modeling spatial worker density and heterogeneous historical ratings.
   - **Key Finding:** Fuzzy trust aggregation prevents unfair permanent exclusion from isolated rating noise while improving completion reliability compared to single-metric or non-trust baselines.
   - **Limitation:** Higher inference computation overhead per matching pass under dense demand; suffers from cold-start uncertainty for new unrated providers and assumes baseline honesty of feedback submitters.

7. **[10] Wang, Zhao & Zhao (2024) — Malicious Participants & Fake Task Detection (ACM *Transactions on Internet Technology*)**
   - **Focus:** Filtering fraudulent tasks and coordinated malicious contributors in mobile crowdsensing platforms.
   - **Method:** Models submission noise and skewed behavioral patterns by incorporating Gaussian bias terms into anomaly classification over participant and task feature distributions.
   - **Dataset & Context:** Evaluated across six real-world mobile/internet behavioral datasets alongside synthetic adversarial submission configurations.
   - **Key Finding:** Explicitly modeling distribution bias improves anomaly separation under skewed crowd data, achieving an average F1-score of 93.44% across test environments.
   - **Limitation:** Statistical anomaly classifiers rely on large historical participant behavioral traces and require labeled adversarial signatures, offering limited prevention at zero-history cold start without structural friction.

---

### Theme C: Hyperlocal Marketplaces, Location Privacy & Labour Geography (3 Papers)

8. **[4] Qiu, Squicciarini, Li, Pang & Yan (2020) — Road-Network Geo-Obfuscation (ACM *CIKM '20*)**
   - **Focus:** Protecting worker location privacy while preserving realistic routing accuracy on urban road networks.
   - **Method:** Models worker mobility as a weighted directed graph over city road networks and solves a Linear Program for an optimal geo-obfuscation (GO) mapping, accelerated via Dantzig–Wolfe decomposition across block constraints.
   - **Dataset & Context:** Real urban mobility trajectory traces and experimental road-network testbeds.
   - **Key Finding:** Graph-aware obfuscation avoids the travel-cost distortion caused by naive 2D Euclidean noise while accelerating LP solver runtime via structural decomposition.
   - **Limitation:** Solver overhead grows for very high concurrent worker counts, assumes a semi-trusted server optimization pass, and degrades under sudden post-report road congestion.

9. **[6] Wang, Yang, Han, Zhang & Ma (2021) — Differential-and-Distortion Geo-Obfuscation (IEEE *TDSC*)**
   - **Focus:** Dual-guarantee location obfuscation allowing proximity task matching without a trusted intermediary server.
   - **Method:** Combines $\epsilon$-differential privacy with bounded $\delta$-distortion constraints inside a Mixed-Integer Non-Linear Programming (MINLP) optimization minimizing expected worker travel distance, extended to multi-task/multi-objective variants.
   - **Dataset & Context:** Real-world urban check-in/mobility traces paired with controlled parametric simulations varying privacy budgets and user density.
   - **Key Finding:** Bounding spatial distortion cuts average worker travel overhead by up to 47% relative to unbounded Laplace perturbation at identical formal privacy budgets.
   - **Limitation:** MINLP formulations remain NP-hard as city density scales; parameter calibration between formal privacy ($\epsilon$) and utility distortion ($\delta$) requires static tuning unsuitable for lightweight directory queries.

10. **[9] Thuppilikkat, Dhar & Chandra (2024) — Space, Tech & On-Demand Digital Labour in India (ACM *PACMHCI / CSCW2*)**
    - **Focus:** Ethnographic and socio-spatial study of how algorithmic on-demand platforms reshape urban service labor organization in the Global South.
    - **Method:** Qualitative fieldwork examining driver collectives, physical vs. digital coordination spaces, algorithmic dispatch rules, and multi-actor state/platform frictions.
    - **Dataset & Context:** Empirical study of app-based cab operators and driver unions operating across Kolkata, India.
    - **Key Finding:** App-based matching dissolved physical street-stand coordination while concentrating opaque control over commission structures, surveillance, and arbitrary deactivation; workers adapted by forming decentralized digital messaging networks for mutual protection.
    - **Limitation:** Primarily qualitative labor critique rather than a concrete software system blueprint; highlights the harm of opaque black-box algorithmic pricing and intermediary lock-in without prototyping an open directory alternative.

---

## 2. Literature Comparison Matrix (Gap Analysis)

| Ref | Author(s) & Year | Approach / System Studied | Key Limitation Identified | How Our Implementation (`samadhan v2`) Addresses It |
| :--- | :--- | :--- | :--- | :--- |
| `[1]` | Yong et al. (2019) | Empirical NLP & frequency analysis of multi-neighborhood SeeClickFix reports | Participation concentrates in a tiny pool of solo power-reporters; lacks shared escalation incentives | Couples ₹5 reporting with low-friction ₹1 `+1` crowd backing (`fundPaise`), turning lone reports into trackable community campaigns. |
| `[2]` | Allen et al. (2020) | Panel analysis of mobile citizen coproduction on subdistrict service clearance | Lacks structured multi-stage authority escalation when single departments stall | Separates status tracking (`transitionIssue`) from threshold-driven Tier 1 social spotlight + Tier 2 `matchAuthority` formal email dispatch. |
| `[3]` | Tong et al. (2020) | Comprehensive survey classifying spatial crowdsourcing matching, quality, incentives, privacy | Identifies tension between dynamic matching utility, non-monetary incentives, and location privacy | Separates non-monetized Local helper discovery (`$geoNear`) from simulated-fee Global civic advocacy, using explicit rounding for privacy. |
| `[4]` | Qiu et al. (2020) | Road-graph LP with Dantzig–Wolfe decomposition for worker geo-obfuscation | Heavy continuous LP computation; assumes active dispatch routing over road graphs | Uses exact coordinates server-side inside MongoDB `$geoNear` filtering against worker `radiusKm`, while truncating public coordinates to 3 decimals ($\approx 110$ m) and stripping street addresses. |
| `[5]` | Kontokosta & Hong (2021) | Gradient-boosted 311 vs. violation audit exposing socio-spatial reporting bias | Raw ticket volume over-allocates resources to vocal neighborhoods while starving quiet areas | Deduplicates repeated local reports via 100 m / 30 d `$geoNear` check, prevents duplicate-inflation (`IssueSupport` unique index), and grants admins `PLATFORM_CREDIT` to amplify neglected issues. |
| `[6]` | Wang et al. (2021) | MINLP differential-and-distortion geo-obfuscation for mobile task assignment | NP-hard optimization overhead; too heavy for real-time neighborhood directory search | Replaces heavy live MINLP solvers with zero-overhead deterministic 3-decimal output truncation + mutual radius matching ($d \le \text{radiusKm} \times 1000$). |
| `[7]` | Zhao et al. (2023) | PSM-DID evaluation of Sacramento 311 open-data transparency impacts | Short-lived engagement bursts and accessibility/language barriers limit sustained civic participation | Provides bilingual EN/HI UI (`react-i18next` + Noto Sans Devanagari), offline PWA draft persistence, public `/i/:id` Open Graph cards, and chronological `IssueUpdate` timelines. |
| `[8]` | Rahman & Abdullah (2023) | Mamdani fuzzy trust inference over multi-criteria worker reliability scores | Cold-start ambiguity and vulnerability to unverified or dishonest reviews | Enforces connection-gated reviews (`Connection.exists` check before `Review` upsert), aggregate-only recomputation (`ratingAvg`/`ratingCount`), and mandatory admin `PENDING -> VERIFIED` onboarding. |
| `[9]` | Thuppilikkat et al. (2024) | CSCW study of Kolkata ridesourcing gig labor, surveillance, and commissions | Opaque platform commissions, continuous tracking, and arbitrary account lockouts harm Indian local workers | Implements Local Mode as a **zero-commission directory** (`cab_driver` phone-only, no fares/GPS tracking), gated `Connect` (10/24 h) keeping seeker PII private, and an explicit flag-dismissal/re-verification admin audit trail. |
| `[10]` | Wang et al. (2024) | Gaussian-bias statistical detector for malicious participants & fake crowdsensing tasks | Statistical detectors need large prior histories and fail during early cold start | Applies proactive structural friction at submission: atomic ₹5/₹1 wallet debits, spatial duplicate blocking (`DUPLICATE_FOUND`), Unicode contact-info blocking (`assertNoContactInfo`), and 3-flag auto-hiding for helpers. |

---

## 3. Verified Reference List (Template Format — Demo Institute Standard)

Formatted identically to `docs/Project Report Template.pdf` (Page 12: *Surname, I., Surname, I. and Surname, I., Year. Title. Venue, Volume(Issue), pp.start-end.*). Note that DOI identifiers are included cleanly after pagination/article numbers for verification traceability (verify whether advisor prefers with or without trailing DOI before final Word generation).

1. Yong, C., Chelmis, C., Lee, W. and Zois, D.-S., 2019. Understanding Online Civic Engagement: A Multi-Neighborhood Study of SeeClickFix. *Proceedings of the 2019 IEEE/ACM International Conference on Advances in Social Networks Analysis and Mining (ASONAM '19)*, pp. 1048–1055. doi: 10.1145/3341161.3345330.
2. Allen, B., Tamindael, L.E., Bickerton, S.H. and Cho, W., 2020. Does citizen coproduction lead to better urban services in smart cities projects? An empirical study on e-participation in a mobile big data platform. *Government Information Quarterly*, 37(1), Article 101412. doi: 10.1016/j.giq.2019.101412.
3. Tong, Y., Zhou, Z., Zeng, Y., Chen, L. and Shahabi, C., 2020. Spatial Crowdsourcing: A Survey. *The VLDB Journal*, 29(1), pp. 217–250. doi: 10.1007/s00778-019-00568-7.
4. Qiu, C., Squicciarini, A.C., Li, Z., Pang, C. and Yan, L., 2020. Time-Efficient Geo-Obfuscation to Protect Worker Location Privacy over Road Networks in Spatial Crowdsourcing. *Proceedings of the 29th ACM International Conference on Information and Knowledge Management (CIKM '20)*, pp. 1275–1284. doi: 10.1145/3340531.3411863.
5. Kontokosta, C.E. and Hong, B., 2021. Bias in smart city governance: How socio-spatial disparities in 311 complaint behavior impact the fairness of data-driven decisions. *Sustainable Cities and Society*, 64, Article 102503. doi: 10.1016/j.scs.2020.102503.
6. Wang, L., Yang, D., Han, X., Zhang, D. and Ma, X., 2021. Mobile Crowdsourcing Task Allocation with Differential-and-Distortion Geo-Obfuscation. *IEEE Transactions on Dependable and Secure Computing*, 18(2), pp. 967–981. doi: 10.1109/TDSC.2019.2912886.
7. Zhao, B., Cheng, S., Schiff, K.J. and Kim, Y., 2023. Digital transparency and citizen participation: Evidence from the online crowdsourcing platform of the City of Sacramento. *Government Information Quarterly*, 40(4), Article 101868. doi: 10.1016/j.giq.2023.101868.
8. Rahman, M.M. and Abdullah, N.A., 2023. A trustworthiness-aware spatial task allocation using a fuzzy-based trust and reputation system approach. *Expert Systems with Applications*, 211, Article 118592. doi: 10.1016/j.eswa.2022.118592.
9. Thuppilikkat, A.A., Dhar, D. and Chandra, P., 2024. Union Makes Us Strong: Space, Technology, and On-Demand Ridesourcing Digital Labour Platforms. *Proceedings of the ACM on Human-Computer Interaction*, 8(CSCW2), Article 463, pp. 1–36. doi: 10.1145/3687002.
10. Wang, J., Zhao, D. and Zhao, G., 2024. Malicious Participants and Fake Task Detection Incorporating Gaussian Bias. *ACM Transactions on Internet Technology*, 24(4), Article 19, pp. 1–19. doi: 10.1145/3696419.
