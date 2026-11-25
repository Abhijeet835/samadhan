# CHAPTER 2

## LITERATURE REVIEW

### 2.1 Platforms and Local Service Marketplaces

Websites that link customers and independent workers behave as two-sided platforms. Rochet and Tirole [1] show that a platform must attract both groups at once, and pricing choices affect whether activity grows. Parker, Van Alstyne and Choudary [2] and Evans and Schmalensee [3] explain that platforms create value by matching both sides well. Starting up is hard, though, when neither consumers nor providers see enough activity yet. Provider listings and local search must therefore work reliably within a few kilometres from day one.

Trust between strangers matters just as much. Resnick et al. [4] note that reputation systems help people decide whom to contact when feedback reflects real work and stays safe from fake scores. That shaped two rules in Local Mode. First, only admin-verified helpers show up in searches, and second, users can leave or edit a review only after recording a real Connect action.

### 2.2 Civic Reporting and Grievance Systems

King and Brown [5] studied FixMyStreet in the United Kingdom, where residents pin local street faults on a map and the site routes reports to the local council. Their work showed how location-based web reporting lets citizens flag public faults directly.

In India, the Centralised Public Grievance Redress and Monitoring System (CPGRAMS) [6] gives citizens an official portal to file grievances to government offices and check status updates. Official portals are essential, yet they handle tickets one by one. Neighbours on the same street cannot see whether fifty others reported the same waterlogging spot, and no shared counter links resident backing to outreach or escalation.

### 2.3 Trust, Fake Participation and Privacy

Public support counters mean little unless each vote belongs to a distinct user account. Douceur [7] proved that open networks without strong identity checks suffer from Sybil attacks, where one actor creates many fake accounts to sway results. In Global Mode, requiring login, enforcing a unique `(issueId, userId)` index, charging a simulated fee, and refunding spam on rejection block single-user vote inflation. Reaching a tier unlocks outreach and email logs, not automatic resolution.

Privacy matters because the app stores locations, phone numbers, and issue photos. India's Digital Personal Data Protection Act, 2023 [8] stresses collecting only necessary data and keeping personal records safe. Public helper queries strip street addresses and round coordinates to about 110 meters. Helper phone numbers stay behind a rate-limited Connect gate, and seeker phones never appear on public pages.

### 2.4 Design Approach

Hevner et al. [9] outline design science research, where an engineering artefact is built to solve real problems and checked against clear criteria. Sommerville [10] notes that risks should be identified early while software grows in tested stages. Following that advice, we built this app in ten phases using MongoDB `2dsphere` queries [11] and Express 5 routes [12]. Each stage passed automated tests before the next began.

### 2.5 Summary and Research Gap

Table 2.1 compares existing platforms discussed in the literature with the implemented Samadhan v2 web application.

*Table 2.1: Comparison of existing approaches and the implemented Problem-Solving Platform (Samadhan v2).*

| Approach | Typical Strength | Typical Limitation | Response in Samadhan v2 |
| :--- | :--- | :--- | :--- |
| Commercial service marketplaces | Quick booking, ratings, and digital payments | Take commissions, track GPS, or leak worker numbers | Free Local Mode with admin verification, ~110 m area, and 10/24h Connect gate |
| Official grievance portals | Direct institutional channel and ticket IDs | Single-user tickets with no shared community count | Public issues with 100 m duplicate grouping and Rs 1 crowd backing |
| Civic map websites | Pin-based reporting by location | Weak outcome follow-up and repeated entries | Six-stage status timeline separated from Tier 1/2 escalation and auto-close cron |
| Social media posts | Fast viral reach | No structured facts, privacy checks, or audit trail | Fact-only EN/HI templates, `/i/:id` link tracking, and PNG share cards |

None of the reviewed systems combines a commission-free, privacy-safe local helper directory with a duplicate-checked, threshold-escalated civic issue network in one bilingual English and Hindi web app. This gap is what Samadhan v2 addresses.
