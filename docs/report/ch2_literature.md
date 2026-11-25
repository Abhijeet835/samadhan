# CHAPTER 2

## LITERATURE REVIEW

### 2.1 Civic Reporting Portals and User Participation

Cities often build online complaint apps hoping residents and staff will talk directly. Real deployment studies show a messier picture. Yong et al. examined neighbourhood tickets on SeeClickFix by cleaning descriptions and counting user posts [1]. A tiny group of repeat reporters filed most tickets, while everyday residents quit when municipal replies slowed down [1].

Do citizen complaints actually speed up repairs? Allen et al. analysed city service logs from a mobile reporting platform across urban subdistricts [2]. Their results showed faster clearance rates when residents reported faults, especially on tough repairs that crossed multiple departments [2]. Still, open tracking dashboards alone do not hold participation steady. Zhao et al. checked Sacramento 311 requests after public tracking pages launched [7]. Submissions rose at first, then dropped off and split along neighbourhood income lines [7].

Kontokosta and Hong found another skew when comparing millions of 311 tickets in New York City and Kansas City against real building and street inspections [5]. Higher-income neighbourhoods logged far more complaints for minor issues, while poorer wards under-reported serious hazards [5]. Dispatching crews from raw duplicate counts sends repairs to the wrong spots. Civic apps need duplicate grouping, fair boosting tools, and visible updates.

### 2.2 Location Tasks, Quality Control, and Spam Filtering

Spatial apps that rely on residents and field workers run into task quality and spam issues. Tong et al. surveyed spatial crowdsourcing across task matching, quality control, incentives, and location privacy [3]. Tuning one rule alone causes side effects elsewhere. Fast matching leaks worker coordinates if positions are exposed, while cash payouts per submission invite junk posts [3].

New platforms also struggle to score worker reliability. Rahman and Abdullah noted that strict pass-or-fail rules drop capable workers after isolated bad reviews [8]. They tested a multi-criteria scoring system to smooth out noisy ratings [8]. That method reduces unfair bans, though multi-factor scoring slows down at scale, cannot judge new workers without history, and trusts reviewers by default [8].

Wang et al. built a statistical detector to spot fake tasks and coordinated spam [10]. Across six real datasets and attack simulations, their classifier hit a 93.44% average F1-score [10]. One clear limitation is cold start: statistical models need large labeled histories before catching bad accounts, so new apps still need hard database checks to block spam on day one.

### 2.3 Local Service Apps and Location Privacy

Local directories need coordinates to sort nearby plumbers, electricians, or drivers, which creates privacy risks. Showing exact home street addresses invites unwanted calls, while adding heavy random noise breaks distance sorting. Wang et al. designed a location-masking method with bounded distance error that cut extra travel distance by up to 47% over simple random noise [6]. Solving optimization equations on every query is slow, though, for a fast neighbourhood search page.

Road layouts also change real travel distance. Qiu et al. modeled worker travel on directed city road graphs using linear programming decomposition to hide positions [4]. That fits live ride-hailing dispatch well, yet a simple local phone directory does not need live road routing.

Fieldwork from India shows a social side to local service apps. Thuppilikkat et al. studied app-based cab drivers in Kolkata to see how digital platforms changed street-stand work [9]. Moving from physical stands to app dispatch brought commission cuts, live GPS tracking, and sudden account bans [9]. Drivers built their own chat groups to support one another [9]. That finding pushed us to keep our local directory free of commissions and live GPS tracking.

### 2.4 Summary of Gaps and Our Design

Civic portals often pile up duplicate reports without turning them into joint backing [1, 2, 5, 7]. Commercial service apps often trade worker privacy and pay for centralized control [3, 4, 6, 8, 9, 10].

In Samadhan v2, we used practical backend checks to address both gaps for a college prototype. Global Mode checks for matching open issues reported in the past month within a 100-meter radius, letting neighbours add a simulated 1-rupee vote onto the same post [1]. Keeping repair status separate from escalation tier preserves crowd progress across slow department repairs [2]. Admins can add platform credit inside a transaction to boost overlooked areas [5], while unique `(issueId, userId)` indexes block double voting.

In Local Mode, our app avoids GPS tracking and commissions [9]. Unlike heavy optimization solvers [4, 6], the backend filters verified helpers with MongoDB geo queries against each worker's chosen service radius. Public API responses drop street addresses and round coordinates to three decimal places (around 110 meters). Phone numbers appear only on an authenticated Connect tap, capped at 10 per 24 hours. Users can leave a review only after connecting, ratings recalculate from database averages, and three distinct flags auto-hide a profile for admin review [8, 10]. Table 2.1 maps all ten papers to our project choices.

*Table 2.1: Research gaps from reviewed papers and how Samadhan v2 addresses them.*

| Ref | Author(s) & Year | Study Focus | Main Gap Found | Solution in Samadhan v2 |
| :---: | :--- | :--- | :--- | :--- |
| `[1]` | Yong et al. (2019) | Complaint frequency and text logs on SeeClickFix | Small group files most reports; low response kills interest | Combines Rs 5 reports with Rs 1 `+1` crowd backing into one shared fund |
| `[2]` | Allen et al. (2020) | Citizen reports and city service clearance rates | Multi-agency issues lack clear escalation stages | Separates status from tier; unlocks social posts (Tier 1) and department email (Tier 2) |
| `[3]` | Tong et al. (2020) | Survey of spatial task matching, quality, and privacy | Speed, rewards, and location privacy pull against each other | Keeps free helper search separate from demo-fee civic reporting with rounded coords |
| `[4]` | Qiu et al. (2020) | Road-graph location masking for spatial workers | Heavy solver overhead built for live vehicle routing | Uses MongoDB distance matching plus 3-decimal coordinate rounding (~110 m) |
| `[5]` | Kontokosta & Hong (2021) | Bias between 311 tickets and real city inspections | Richer areas over-report while poorer wards are ignored | Blocks 100 m duplicates and adds admin platform credit for neglected issues |
| `[6]` | Wang et al. (2021) | Privacy-preserving geo masking with travel limits | Complex optimization is slow for simple search queries | Uses fast 3-decimal coordinate snapping with mutual user/helper radius checks |
| `[7]` | Zhao et al. (2023) | Effects of Sacramento 311 tracking dashboards | Usage drops quickly and misses non-English or offline users | Provides full EN/HI UI (817 keys), 7-day offline form drafts, and live timelines |
| `[8]` | Rahman & Abdullah (2023) | Multi-criteria soft trust scoring for spatial workers | Cold-start ambiguity and risk of unverified reviews | Requires admin verification, Connect-gated reviews, and database `$avg` ratings |
| `[9]` | Thuppilikkat et al. (2024) | Field study of app-based cab drivers in Kolkata | Commissions, live tracking, and sudden bans hurt workers | Runs Local Mode free without commissions or GPS tracking (`CAB_DRIVER` phone-only) |
| `[10]` | Wang et al. (2024) | Statistical detector for fake crowdsourcing tasks | Needs large past logs; misses day-one spam attacks | Uses small demo wallet fees, unique support indexes, contact text blocks, and 3-flag hides |
