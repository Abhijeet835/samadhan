// Rich demo data — ALL via real services so ledger & data-integrity invariants hold.
// Zero external API/SMTP calls: integration env vars blanked before import.
for (const k of ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASS', 'N8N_WEBHOOK_URL', 'N8N_WEBHOOK_SECRET', 'TELEGRAM_BOT_TOKEN', 'TELEGRAM_CHAT_ID', 'BUFFER_API_KEY', 'BUFFER_CHANNEL_X', 'BUFFER_CHANNEL_FB', 'BUFFER_CHANNEL_IG', 'UPLOAD_POST_API_KEY', 'REDDIT_CLIENT_ID', 'REDDIT_CLIENT_SECRET', 'REDDIT_REFRESH_TOKEN', 'GEMINI_API_KEY', 'DISPATCH_OVERRIDE_TO']) {
  process.env[k] = '';
}
process.env.ENABLE_CRON = 'false';

const RESET = process.argv.includes('--reset');

const { connectDB, disconnectDB } = await import('../config/db.js');
const { default: User } = await import('../modules/users/user.model.js');
const { default: Wallet } = await import('../modules/wallet/wallet.model.js');
const { default: WalletTxn } = await import('../modules/wallet/walletTxn.model.js');
const { default: Issue } = await import('../modules/issues/issue.model.js');
const { default: IssueSupport } = await import('../modules/issues/issueSupport.model.js');
const { default: IssueUpdate } = await import('../modules/issues/issueUpdate.model.js');
const { default: IssueFlag } = await import('../modules/admin/issueFlag.model.js');
const { default: Connection } = await import('../modules/helpers/connection.model.js');
const { default: Review } = await import('../modules/helpers/review.model.js');
const { default: Helper } = await import('../modules/helpers/helper.model.js');
const { default: Booking } = await import('../modules/bookings/booking.model.js');
const { default: SocialPost } = await import('../modules/social/socialPost.model.js');
const { default: DispatchLog } = await import('../modules/dispatch/dispatchLog.model.js');
const { default: Notification } = await import('../modules/notifications/notification.model.js');
const { default: Settings } = await import('../modules/wallet/settings.model.js');
const { ensureDefaultSettings, ensureWallet, topupWallet, getSetting } = await import('../modules/wallet/wallet.service.js');
const { createIssue, supportIssue, transitionIssue, recordResolution, addFundUtilization } = await import('../modules/issues/issue.service.js');
const { connectHelper, upsertReview } = await import('../modules/helpers/helper.service.js');
const { createBooking, transitionBooking } = await import('../modules/bookings/booking.service.js');
const { platformCredit, authorityReply } = await import('../modules/admin/admin.service.js');
const { guardDemoSeed } = await import('./seedGuard.util.js');
const bcrypt = (await import('bcrypt')).default;

guardDemoSeed();

const DEMO_ISSUES = [
  // 1. Social Explosion — SMALL (Reached)
  {
    title: 'Collapsed drain slab near Indiranagar 100ft Road crosswalk',
    titleHi: 'इंदिरानगर 100 फीट रोड क्रॉसवॉक के पास नाली का टूटा स्लैब',
    description: 'Two concrete storm-drain slabs have caved in right beside the bus stop, creating a dangerous open drop for pedestrians and two-wheelers during evening rush hour.',
    descriptionHi: 'बस स्टॉप के ठीक बगल में बारिश की नाली के दो कंक्रीट स्लैब धंस गए हैं, जिससे शाम की भीड़ में पैदल यात्रियों और दोपहिया वाहनों के लिए गंभीर खतरा बन गया है।',
    category: 'BROKEN_ROADS',
    issueType: 'SOCIAL_EXPLOSION',
    importance: 'SMALL',
    location: {
      coordinates: [77.6412, 12.9718],
      address: '100 Feet Road, Indiranagar',
      addressHi: '100 फीट रोड, इंदिरानगर',
      city: 'Bengaluru',
      cityHi: 'बेंगलुरु',
      state: 'Karnataka',
      pincode: '560038',
    },
    supporters: 5,
    status: 'ACKNOWLEDGED',
  },
  // 2. Social Explosion — MEDIUM (Reached -> Triggers IG + X campaign)
  {
    title: 'Severe waterlogging and sewage overflow across Dadar East lanes',
    titleHi: 'दादर ईस्ट की गलियों में भारी जलभराव और सीवेज ओवरफ़्लो',
    description: 'Blocked underground stormwater lines have caused untreated sewage to back up onto residential streets for five consecutive days, affecting school commuters and ground-floor shops.',
    descriptionHi: 'भूमिगत स्टॉर्मवॉटर लाइन बंद होने से लगातार पांच दिनों से आवासीय गलियों में गंदा सीवेज भर रहा है, जिससे स्कूली छात्रों और दुकानदारों को भारी परेशानी हो रही है।',
    category: 'SEWAGE_DRAINAGE',
    issueType: 'SOCIAL_EXPLOSION',
    importance: 'MEDIUM',
    location: {
      coordinates: [72.8432, 19.0178],
      address: 'Naigaon Cross Road, Dadar East',
      addressHi: 'नायगांव क्रॉस रोड, दादर ईस्ट',
      city: 'Mumbai',
      cityHi: 'मुंबई',
      state: 'Maharashtra',
      pincode: '400014',
    },
    supporters: 8,
    status: 'IN_PROGRESS',
  },
  // 3. Social Explosion — LARGE (Not reached yet — national public facility demand)
  {
    title: 'Need for AIIMS-grade tertiary medical & trauma centre in Southern Jharkhand',
    titleHi: 'दक्षिणी झारखंड में एम्स स्तर के टर्शियरी मेडिकल और ट्रॉमा सेंटर की माँग',
    description: 'Patients across Ranchi, Khunti, and Simdega currently travel hundreds of kilometres for specialized oncology and trauma care. Citizens urge state and central planners to prioritize a regional AIIMS/super-specialty campus.',
    descriptionHi: 'रांची, खूंटी और सिमडेगा के मरीजों को गंभीर कैंसर और ट्रॉमा इलाज के लिए सैकड़ों किलोमीटर दूर जाना पड़ता है। नागरिकों ने क्षेत्र में एम्स स्तर का सुपर-स्पेशलिटी केंद्र स्थापित करने की माँग की है।',
    category: 'PUBLIC_FACILITIES',
    issueType: 'SOCIAL_EXPLOSION',
    importance: 'LARGE',
    location: {
      coordinates: [85.3096, 23.3441],
      address: 'Kanke Road Civic Zone',
      addressHi: 'कांके रोड नागरिक क्षेत्र',
      city: 'Ranchi',
      cityHi: 'रांची',
      state: 'Jharkhand',
      pincode: '834008',
    },
    supporters: 7,
    status: 'ACTIVE',
  },
  // 4. Social Explosion — LARGE (Reached -> High-impact public campaign)
  {
    title: 'Demand for dedicated IIT / Technical Innovation Campus in North-East Corridor',
    titleHi: 'पूर्वोत्तर गलियारे में समर्पित आईआईटी और तकनीकी नवाचार परिसर की माँग',
    description: 'Students from Assam and neighbouring states face limited seat capacity in premier engineering and research institutions. Expanding technical higher-education infrastructure will unlock regional innovation.',
    descriptionHi: 'असम और पड़ोसी राज्यों के छात्रों को प्रमुख इंजीनियरिंग एवं शोध संस्थानों में सीमित सीटों का सामना करना पड़ता है। उच्च तकनीकी शिक्षा ढांचे के विस्तार से क्षेत्रीय नवाचार को बढ़ावा मिलेगा।',
    category: 'EDUCATION_INFRA',
    issueType: 'SOCIAL_EXPLOSION',
    importance: 'LARGE',
    location: {
      coordinates: [91.7362, 26.1445],
      address: 'Jalukbari Academic Zone',
      addressHi: 'जालुकबाड़ी शैक्षणिक क्षेत्र',
      city: 'Guwahati',
      cityHi: 'गुवाहाटी',
      state: 'Assam',
      pincode: '781014',
    },
    supporters: 13,
    status: 'ACKNOWLEDGED',
  },
  // 5. Pool Funds — In Progress (Stray Animal Rescue)
  {
    title: 'Emergency rescue, surgery and vaccination for injured stray dogs in Rohini Sector 7',
    titleHi: 'रोहिणी सेक्टर 7 में घायल आवारा श्वानों के आपात उपचार, सर्जरी और टीकाकरण अभियान',
    description: 'Six community stray dogs suffered highway injuries and untreated infections near Sector 7 market. Local volunteers and a partner veterinary NGO are pooling funds for trauma surgery, sterilization, and anti-rabies shots.',
    descriptionHi: 'सेक्टर 7 बाज़ार के पास छह सामुदायिक श्वान सड़क दुर्घटना और संक्रमण से घायल हैं। स्थानीय स्वयंसेवक और पशु चिकित्सा एनजीओ सर्जरी, नसबंदी और एंटी-रेबीज़ टीकाकरण के लिए फंड जुटा रहे हैं।',
    category: 'STRAY_ANIMALS',
    issueType: 'POOL_FUNDS',
    importance: 'SMALL',
    fundingGoalPaise: 4000,
    responsibleParty: {
      type: 'NGO',
      name: 'Paws & Hope Animal Welfare Foundation',
      nameHi: 'पॉज़ एंड होप पशु कल्याण फाउंडेशन',
      contactRole: 'Lead Vet Coordinator',
      note: 'Daily treatment logs shared with contributors',
    },
    contributions: [800, 1000, 700],
    utilization: [
      { item: 'Emergency vet X-ray & wound dressing', amountPaise: 1200, note: 'Completed for 3 dogs at Sector 7 clinic' },
      { item: 'Anti-rabies & antibiotic course', amountPaise: 900, note: '14-day medicine stock procured' },
    ],
    location: {
      coordinates: [77.118, 28.711],
      address: 'Sector 7 Market Park, Rohini',
      addressHi: 'सेक्टर 7 मार्केट पार्क, रोहिणी',
      city: 'New Delhi',
      cityHi: 'नई दिल्ली',
      state: 'Delhi',
      pincode: '110085',
    },
    status: 'IN_PROGRESS',
  },
  // 6. Pool Funds — Goal Reached & Solved by NGO (Promoted!)
  {
    title: 'Community-funded solar streetlights and safe rescue shelter in Gomti Nagar',
    titleHi: 'गोमती नगर में समुदाय-वित्तपोषित सौर स्ट्रीटलाइट और सुरक्षित गली पहल',
    description: 'Dark pedestrian alleys behind the vegetable mandi caused accidents and unsafe night crossings. Community members pooled funds with an environmental NGO to install solar LED poles.',
    descriptionHi: 'सब्ज़ी मंडी के पीछे अंधेरी गलियों में रात के समय दुर्घटनाएँ और असुरक्षा रहती थी। निवासियों ने पर्यावरण एनजीओ के साथ मिलकर सौर एलईडी खंभे लगाने हेतु फंड पूल किया।',
    category: 'WATER_ELECTRICITY',
    issueType: 'POOL_FUNDS',
    importance: 'MEDIUM',
    fundingGoalPaise: 5000,
    responsibleParty: {
      type: 'NGO',
      name: 'Roshni Clean Energy Collective',
      nameHi: 'रोशनी स्वच्छ ऊर्जा कलेक्टिव',
      contactRole: 'Project Lead',
      note: '8-pole solar installation complete',
    },
    contributions: [1500, 2000, 1500],
    utilization: [
      { item: '8 Solar LED poles & LiFePO4 batteries', amountPaise: 3800, note: 'Procured from certified supplier' },
      { item: 'Pole erection & electrician labour', amountPaise: 1200, note: 'Completed across 450 m stretch' },
    ],
    resolution: {
      solverType: 'NGO',
      organizationName: 'Roshni Clean Energy Collective',
      organizationNameHi: 'रोशनी स्वच्छ ऊर्जा कलेक्टिव',
      departmentOrLead: 'Rural & Urban Microgrid Team',
      departmentOrLeadHi: 'ग्रामीण एवं शहरी माइक्रोग्रिड टीम',
      resolutionDetails: 'Installed 8 dusk-to-dawn solar LED poles with 3-year maintenance warranty funded by neighbourhood contributors.',
      resolutionDetailsHi: 'मोहल्ले के योगदानकर्ताओं के फंड से 3 साल की रखरखाव वारंटी सहित 8 ऑटोमैटिक सौर एलईडी लाइटें लगाई गईं।',
      impactSummary: '450 m market lane illuminated every night; zero night-time accidents reported since installation.',
      impactSummaryHi: '450 मीटर बाज़ार मार्ग हर रात रोशन रहता है; स्थापना के बाद से एक भी रात्रि दुर्घटना नहीं हुई।',
      promotion: {
        enabled: true,
        tagline: 'Powering safer Indian neighbourhoods with clean solar infrastructure',
        badgeText: 'Verified Civic NGO Partner',
        websiteUrl: 'https://example.org/roshni-collective',
      },
    },
    location: {
      coordinates: [80.996, 26.854],
      address: 'Patrakar Puram Lane, Gomti Nagar',
      addressHi: 'पत्रकार पुरम लेन, गोमती नगर',
      city: 'Lucknow',
      cityHi: 'लखनऊ',
      state: 'Uttar Pradesh',
      pincode: '226010',
    },
    status: 'RESOLVED',
  },
  // 7. Resolved by Government Department
  {
    title: 'Deep potholes and damaged culvert on Malviya Nagar Main Avenue',
    titleHi: 'मालवीय नगर मेन एवेन्यू पर गहरे गड्ढे और क्षतिग्रस्त पुलिया',
    description: 'Monsoon erosion tore away a 180-metre stretch near the school gate, causing daily traffic bottlenecks and two-wheeler skids.',
    descriptionHi: 'मानसून के कटाव से स्कूल गेट के पास 180 मीटर सड़क उखड़ गई थी, जिससे रोज़ाना ट्रैफ़िक जाम और दोपहिया वाहन फिसलने की घटनाएँ हो रही थीं।',
    category: 'BROKEN_ROADS',
    issueType: 'SOCIAL_EXPLOSION',
    importance: 'MEDIUM',
    location: {
      coordinates: [75.812, 26.855],
      address: 'Main Avenue, Malviya Nagar',
      addressHi: 'मेन एवेन्यू, मालवीय नगर',
      city: 'Jaipur',
      cityHi: 'जयपुर',
      state: 'Rajasthan',
      pincode: '302017',
    },
    supporters: 7,
    resolution: {
      solverType: 'GOVERNMENT',
      organizationName: 'Jaipur Municipal Corporation (JMC Greater)',
      organizationNameHi: 'जयपुर नगर निगम (ग्रेटर)',
      departmentOrLead: 'Public Works & Road Maintenance Wing',
      departmentOrLeadHi: 'लोक निर्माण और सड़क रखरखाव प्रभाग',
      resolutionDetails: 'Resurfaced the 180-metre stretch with hot-mix bitumen and reinforced the storm culvert grating.',
      resolutionDetailsHi: '180 मीटर हिस्से पर हॉट-मिक्स डामरीकरण किया गया और बरसाती पुलिया की जाली को मज़बूत किया गया।',
      impactSummary: 'Smooth two-lane commute restored for ~6,000 daily commuters and school buses.',
      impactSummaryHi: 'लगभग 6,000 दैनिक यात्रियों और स्कूल बसों के लिए सुरक्षित दो-लेन आवागमन बहाल हुआ।',
    },
    status: 'RESOLVED',
  },
  // 8. Resolved by Private Company (CSR Recognition & Promotion!)
  {
    title: 'Smart waste segregation kiosks & daily collection bins at T. Nagar Market',
    titleHi: 'टी. नगर बाज़ार में स्मार्ट कचरा पृथक्करण कियोस्क और दैनिक संग्रहण डिब्बे',
    description: 'Overflowing open garbage dumps beside the textile bazaar created foul odour and blocked footpaths.',
    descriptionHi: 'कपड़ा बाज़ार के पास खुले कूड़ेदान ओवरफ़्लो होने से दुर्गंध फैल रही थी और फुटपाथ अवरुद्ध हो रहे थे।',
    category: 'GARBAGE_MANAGEMENT',
    issueType: 'SOCIAL_EXPLOSION',
    importance: 'SMALL',
    location: {
      coordinates: [80.2337, 13.0418],
      address: 'Usman Road Junction, T. Nagar',
      addressHi: 'उस्मान रोड जंक्शन, टी. नगर',
      city: 'Chennai',
      cityHi: 'चेन्नई',
      state: 'Tamil Nadu',
      pincode: '600017',
    },
    supporters: 5,
    resolution: {
      solverType: 'PRIVATE_ORG',
      organizationName: 'Apex GreenInfra Pvt. Ltd.',
      organizationNameHi: 'एपेक्स ग्रीनइंफ्रा प्रा. लि.',
      departmentOrLead: 'CSR Clean Cities Initiative',
      departmentOrLeadHi: 'सीएसआर स्वच्छ शहर पहल',
      resolutionDetails: 'Sponsored and installed 6 twin-bin stainless segregation stations with IoT fill alerts linked to local sanitation crews.',
      resolutionDetailsHi: 'स्वच्छता कर्मियों से जुड़े IoT भराव अलर्ट वाले 6 स्टेनलेस स्टील ट्विन-बिन पृथक्करण स्टेशन लगाए गए।',
      impactSummary: '1.2 tonnes/day dry-wet waste segregated at source; footpath cleared completely.',
      impactSummaryHi: 'प्रतिदिन 1.2 टन गीले-सूखे कचरे का स्रोत पर पृथक्करण शुरू हुआ और फुटपाथ पूरी तरह साफ हुआ।',
      promotion: {
        enabled: true,
        tagline: 'Building zero-waste commercial districts through CSR engineering',
        badgeText: 'CSR Impact Partner',
        websiteUrl: 'https://example.org/apex-greeninfra',
      },
    },
    status: 'RESOLVED',
  },
  // 9. Resolved by NGO (Stray Animals)
  {
    title: 'High stray dog bite incidents and lack of ABC vaccination drive in Salt Lake',
    titleHi: 'सॉल्ट लेक में आवारा श्वानों के काटने की घटनाएँ और एबीसी टीकाकरण शिविर की माँग',
    description: 'Residents requested humane Animal Birth Control (ABC) and anti-rabies vaccination camps near Sector II parks.',
    descriptionHi: 'निवासियों ने सेक्टर II पार्कों के पास मानवीय पशु जन्म नियंत्रण (ABC) और एंटी-रेबीज़ टीकाकरण शिविर लगाने की माँग की थी।',
    category: 'STRAY_ANIMALS',
    issueType: 'SOCIAL_EXPLOSION',
    importance: 'SMALL',
    location: {
      coordinates: [88.414, 22.586],
      address: 'Sector II Central Park, Salt Lake',
      addressHi: 'सेक्टर II सेंट्रल पार्क, सॉल्ट लेक',
      city: 'Kolkata',
      cityHi: 'कोलकाता',
      state: 'West Bengal',
      pincode: '700091',
    },
    supporters: 4,
    resolution: {
      solverType: 'NGO',
      organizationName: 'Paws & Hope Animal Welfare Foundation',
      organizationNameHi: 'पॉज़ एंड होप पशु कल्याण फाउंडेशन',
      departmentOrLead: 'Urban ABC & Vaccination Unit',
      departmentOrLeadHi: 'शहरी एबीसी एवं टीकाकरण इकाई',
      resolutionDetails: 'Conducted a 4-day humane vaccination & sterilization drive covering 34 community dogs with collar tagging.',
      resolutionDetailsHi: '4 दिवसीय मानवीय टीकाकरण व नसबंदी अभियान चलाकर 34 सामुदायिक श्वानों का उपचार व कॉलर टैगिंग की गई।',
      impactSummary: '34 stray dogs vaccinated and sterilized; zero bite complaints over the past month.',
      impactSummaryHi: '34 आवारा श्वानों का टीकाकरण व नसबंदी पूरी हुई; पिछले महीने शून्य काटने की शिकायत दर्ज हुई।',
      promotion: {
        enabled: true,
        tagline: 'Compassionate science-backed street animal care across Indian cities',
        badgeText: 'Top Animal Welfare NGO',
        websiteUrl: 'https://example.org/paws-hope',
      },
    },
    status: 'RESOLVED',
  },
  // 10. Pool Funds — Active (Road Patch Repair)
  {
    title: 'Neighbourhood fund pool to fix hazardous school lane speed-breakers in Kankarbagh',
    titleHi: 'कंकड़बाग में स्कूल गली के खतरनाक स्पीड-ब्रेकर ठीक करने के लिए सामुदायिक फंड पूल',
    description: 'Broken asphalt and missing reflective strips around the primary school gate cause frequent falls during rains. Residents are pooling funds for concrete patching and zebra markings.',
    descriptionHi: 'प्राथमिक विद्यालय गेट के पास टूटे डामर और रिफ्लेक्टिव पट्टी न होने से बारिश में वाहन फिसलते हैं। निवासी पैच रिपेयर और ज़ेबरा मार्किंग के लिए फंड जुटा रहे हैं।',
    category: 'BROKEN_ROADS',
    issueType: 'POOL_FUNDS',
    importance: 'SMALL',
    fundingGoalPaise: 3000,
    responsibleParty: {
      type: 'PRIVATE_ORG',
      name: 'Patna Civic Builders Guild',
      nameHi: 'पटना सिविक बिल्डर्स गिल्ड',
      contactRole: 'Volunteer Civil Engineer',
      note: 'Materials cost only; labour volunteered',
    },
    contributions: [500, 600],
    utilization: [
      { item: 'Cold-mix asphalt bags & reflective road paint', amountPaise: 1100, note: 'First batch ordered' },
    ],
    location: {
      coordinates: [85.161, 25.596],
      address: 'Kankarbagh Main Road',
      addressHi: 'कंकड़बाग मेन रोड',
      city: 'Patna',
      cityHi: 'पटना',
      state: 'Bihar',
      pincode: '800020',
    },
    status: 'ACTIVE',
  },
  // 11. Bilingual Issue — Social Explosion (SMALL, Not reached yet)
  {
    title: 'Severe uncollected garbage piles and blocked drains near MG Road bus stop',
    titleHi: 'एमजी रोड बस स्टॉप के पास कचरे और सीवेज की गंभीर समस्या',
    description: 'Overflowing uncollected waste and clogged roadside drains for two consecutive weeks have created unbearable stench and blocked access for pedestrians and shopkeepers.',
    descriptionHi: 'पिछले दो सप्ताह से कचरा न उठने और नाली जाम होने के कारण पैदल यात्रियों और दुकानदारों को भारी परेशानी हो रही है।',
    category: 'GARBAGE_MANAGEMENT',
    issueType: 'SOCIAL_EXPLOSION',
    importance: 'SMALL',
    location: {
      coordinates: [77.607, 12.975],
      address: 'MG Road Bus Stop',
      addressHi: 'एमजी रोड बस स्टॉप',
      city: 'Bengaluru',
      cityHi: 'बेंगलुरु',
      state: 'Karnataka',
      pincode: '560001',
    },
    supporters: 2,
    status: 'ACTIVE',
  },
  // 12. Bilingual Issue — Pool Funds (Active)
  {
    title: 'Clean drinking water and RO purifier initiative for Arera Colony government school children',
    titleHi: 'सरकारी स्कूल के बच्चों के लिए स्वच्छ पेयजल और आरओ फिल्टर पहल',
    description: 'Damaged taps and contaminated storage tanks at the local primary school put students at health risk. The neighbourhood is pooling funds with an education NGO to install a clean RO drinking unit.',
    descriptionHi: 'स्थानीय प्राथमिक विद्यालय में पेयजल व्यवस्था खराब होने से बच्चों को परेशानी हो रही है। समुदाय द्वारा स्वच्छ पानी के लिए फंड एकत्र किया जा रहा है।',
    category: 'EDUCATION_INFRA',
    issueType: 'POOL_FUNDS',
    importance: 'MEDIUM',
    fundingGoalPaise: 6000,
    responsibleParty: {
      type: 'NGO',
      name: 'Vidya Setu Rural Education NGO',
      nameHi: 'विद्या सेतु ग्रामीण शिक्षा एनजीओ',
      contactRole: 'School Infrastructure Coordinator',
    },
    contributions: [1000, 1200],
    location: {
      coordinates: [77.4126, 23.2599],
      address: 'Arera Colony School Road',
      addressHi: 'अरेरा कॉलोनी स्कूल रोड',
      city: 'Bhopal',
      cityHi: 'भोपाल',
      state: 'Madhya Pradesh',
      pincode: '462016',
    },
    status: 'ACTIVE',
  },
  // 13. Extra State coverage: Telangana (Hyderabad)
  {
    title: 'Frequent voltage fluctuations and exposed transformer cables in Madhapur',
    titleHi: 'माधापुर में बार-बार वोल्टेज उतार-चढ़ाव और खुले ट्रांसफ़ॉर्मर केबल का खतरा',
    description: 'Low-hanging live distribution wires outside residential apartments pose an electrical fire hazard during windy evenings.',
    descriptionHi: 'आवासीय अपार्टमेंट के बाहर नीचे लटकते बिजली के तार तेज़ हवा के दौरान आग लगने का गंभीर खतरा पैदा कर रहे हैं।',
    category: 'WATER_ELECTRICITY',
    issueType: 'SOCIAL_EXPLOSION',
    importance: 'MEDIUM',
    location: {
      coordinates: [78.3915, 17.4486],
      address: 'Ayyappa Society Road, Madhapur',
      addressHi: 'अय्यप्पा सोसाइटी रोड, माधापुर',
      city: 'Hyderabad',
      cityHi: 'हैदराबाद',
      state: 'Telangana',
      pincode: '500081',
    },
    supporters: 6,
    status: 'ACTIVE',
  },
  // 14. Extra State coverage: Gujarat (Ahmedabad)
  {
    title: 'Clean drinking water contamination alerts in Vatva industrial belt',
    titleHi: 'वटवा औद्योगिक क्षेत्र में पेयजल प्रदूषण की गंभीर शिकायत',
    description: 'Residents report discoloured tap water every morning and demand immediate pipeline flushing and quality testing.',
    descriptionHi: 'निवासियों को रोज़ सुबह मटमैला और बदबूदार पानी मिल रहा है; तुरंत पाइपलाइन सफाई और जल गुणवत्ता जांच की माँग की गई है।',
    category: 'WATER_ELECTRICITY',
    issueType: 'SOCIAL_EXPLOSION',
    importance: 'LARGE',
    location: {
      coordinates: [72.634, 22.961],
      address: 'Vatva GIDC Phase II',
      addressHi: 'वटवा जीआईडीसी फेज़ II',
      city: 'Ahmedabad',
      cityHi: 'अहमदाबाद',
      state: 'Gujarat',
      pincode: '382445',
    },
    supporters: 13,
    status: 'ACKNOWLEDGED',
  },
  // 15. Extra UT coverage: Chandigarh
  {
    title: 'Dedicated cycle-track lighting and signage upgrade in Sector 17–22 corridor',
    titleHi: 'सेक्टर 17–22 कॉरिडोर में साइकिल ट्रैक लाइटिंग और साइनबोर्ड सुधार',
    description: 'Missing solar studs and faded pedestrian markings reduce evening safety along the Sector 17–22 cycling lane.',
    descriptionHi: 'सेक्टर 17–22 साइकिल पथ पर सोलर स्टड और सड़क चिह्न मिट जाने से शाम के समय साइकिल चालकों की सुरक्षा प्रभावित हो रही है।',
    category: 'PUBLIC_FACILITIES',
    issueType: 'SOCIAL_EXPLOSION',
    importance: 'SMALL',
    location: {
      coordinates: [76.7794, 30.7333],
      address: 'Jan Marg Sector 17',
      addressHi: 'जन मार्ग सेक्टर 17',
      city: 'Chandigarh',
      cityHi: 'चंडीगढ़',
      state: 'Chandigarh',
      pincode: '160017',
    },
    supporters: 3,
    status: 'ACTIVE',
  },
  // 16. Extra UT coverage: Jammu & Kashmir
  {
    title: 'Winter drainage de-silting required along Residency Road commercial stretch',
    titleHi: 'रेजीडेंसी रोड बाज़ार मार्ग पर शीतकालीन नाला गाद सफाई की आवश्यकता',
    description: 'Blocked roadside culverts freeze and flood pedestrian sidewalks after light snowfall and rain.',
    descriptionHi: 'सड़क किनारे बंद नालियां हल्की बर्फबारी और बारिश के बाद जम जाती हैं, जिससे पैदल मार्ग पर पानी भर जाता है।',
    category: 'SEWAGE_DRAINAGE',
    issueType: 'SOCIAL_EXPLOSION',
    importance: 'MEDIUM',
    location: {
      coordinates: [74.812, 34.072],
      address: 'Residency Road, Lal Chowk',
      addressHi: 'रेजीडेंसी रोड, लाल चौक',
      city: 'Srinagar',
      cityHi: 'श्रीनगर',
      state: 'Jammu and Kashmir',
      pincode: '190001',
    },
    supporters: 4,
    status: 'ACTIVE',
  },
  // 17. Extra State coverage: Kerala (Kochi)
  {
    title: 'Canal desilting and mosquito control ahead of monsoon in Ernakulam',
    titleHi: 'एर्नाकुलम में मानसून से पहले नहर सफाई और मच्छर नियंत्रण अभियान',
    description: 'Plastic accumulation in Perandoor canal narrows water flow and increases vector-borne illness risk.',
    descriptionHi: 'पेरंदूर नहर में प्लास्टिक कचरा जमा होने से जल प्रवाह बाधित हो रहा है और डेंगू-मलेरिया का खतरा बढ़ रहा है।',
    category: 'GARBAGE_MANAGEMENT',
    issueType: 'SOCIAL_EXPLOSION',
    importance: 'MEDIUM',
    location: {
      coordinates: [76.299, 9.981],
      address: 'Kaloor-Kadavanthra Link',
      addressHi: 'कलूर-कडवंथरा लिंक रोड',
      city: 'Kochi',
      cityHi: 'कोच्चि',
      state: 'Kerala',
      pincode: '682017',
    },
    supporters: 6,
    resolution: {
      solverType: 'GOVERNMENT',
      organizationName: 'Kochi Municipal Corporation',
      organizationNameHi: 'कोच्चि नगर निगम',
      departmentOrLead: 'Health & Canal Sanitation Wing',
      departmentOrLeadHi: 'स्वास्थ्य एवं नहर स्वच्छता प्रभाग',
      resolutionDetails: 'Deployed amphibious weed harvester and removed 14 tonnes of plastic silt from 1.2 km canal section.',
      resolutionDetailsHi: '1.2 किमी नहर से जलकुंभी व 14 टन प्लास्टिक गाद मशीनों द्वारा साफ की गई।',
      impactSummary: 'Restored free stormwater drainage across 4 wards ahead of peak rains.',
      impactSummaryHi: 'तेज़ बारिश से पहले 4 वार्डों में बरसाती जल निकासी पूरी तरह सुचारू हुई।',
    },
    status: 'RESOLVED',
  },
  // 18. Extra State coverage: Odisha (Bhubaneswar)
  {
    title: 'Upgrade rural science labs and smart classrooms in Khordha block schools',
    titleHi: 'खोर्धा ब्लॉक के विद्यालयों में विज्ञान प्रयोगशाला और स्मार्ट क्लासरूम उन्नयन',
    description: 'High school students lack basic chemistry/physics lab kits and stable broadband connectivity for board exam preparation.',
    descriptionHi: 'उच्च विद्यालयों के छात्रों के पास बोर्ड परीक्षा तैयारी हेतु बुनियादी रसायन/भौतिक प्रयोगशाला उपकरण और स्थिर इंटरनेट की कमी है।',
    category: 'EDUCATION_INFRA',
    issueType: 'SOCIAL_EXPLOSION',
    importance: 'LARGE',
    location: {
      coordinates: [85.8245, 20.2961],
      address: 'Unit 4 Academic Circle',
      addressHi: 'यूनिट 4 शैक्षणिक सर्किल',
      city: 'Bhubaneswar',
      cityHi: 'भुवनेश्वर',
      state: 'Odisha',
      pincode: '751001',
    },
    supporters: 5,
    status: 'ACTIVE',
  },
];

async function ensureUser(email, name, role, phone, passwordPlain = 'Demo@12345') {
  let u = await User.findOne({ email });
  if (!u) {
    u = await User.create({
      name,
      email,
      phone,
      password: await bcrypt.hash(passwordPlain, 10),
      role,
      language: 'en',
      activeMode: role === 'PROVIDER' ? 'LOCAL' : 'GLOBAL',
    });
  } else if (u.role === 'CITIZEN' || u.role === 'HELPER') {
    u.role = u.role === 'HELPER' ? 'PROVIDER' : 'CONSUMER';
    await u.save();
  }
  await ensureWallet(u._id);
  return u;
}

async function reset() {
  const demoUsers = await User.find({
    $or: [{ email: /^demo\./ }, { email: 'consumer@samadhan.local' }],
    role: { $ne: 'ADMIN' },
  }).select('_id').lean();
  const ids = demoUsers.map((u) => u._id);

  await Booking.deleteMany({});
  await Helper.deleteMany({ isSample: true });
  await User.deleteMany({ email: /^(helper\d+@example\.org|provider@samadhan\.local)$/ });
  await Notification.deleteMany({});
  await SocialPost.deleteMany({});
  await DispatchLog.deleteMany({});
  await IssueFlag.deleteMany({});
  await IssueUpdate.deleteMany({});
  await IssueSupport.deleteMany({});
  await Issue.deleteMany({});
  await Connection.deleteMany({});
  await Review.deleteMany({});
  await WalletTxn.deleteMany({ userId: { $in: ids } });
  await Wallet.deleteMany({ userId: { $in: ids } });
  // Also ensure any provider/helper wallets match their remaining txns after reset
  await WalletTxn.deleteMany({ type: { $in: ['BOOKING_PAYOUT', 'BOOKING_PAYMENT', 'BOOKING_REFUND', 'REPORT_FEE', 'SUPPORT_FEE', 'POOL_CONTRIBUTION', 'REFUND'] } });
  const remainingWallets = await Wallet.find().lean();
  for (const rw of remainingWallets) {
    const sum = await WalletTxn.aggregate([{ $match: { userId: rw.userId } }, { $group: { _id: null, total: { $sum: '$amountPaise' } } }]);
    await Wallet.updateOne({ _id: rw._id }, { $set: { balancePaise: sum[0]?.total ?? 0 } });
  }
  await Helper.updateMany({}, { $set: { bookingCount: 0, totalEarningsPaise: 0, connectCount: 0, ratingAvg: 0, ratingCount: 0 } });
  await User.deleteMany({ _id: { $in: ids } });
  console.log('[seed:demo] reset removed old demo issues/bookings/demo consumers.');
}

async function seed() {
  await connectDB();
  await ensureDefaultSettings();
  if (RESET) {
    await reset();
    await disconnectDB();
    return;
  }

  // Migrate any legacy CITIZEN/HELPER roles in existing users
  await User.updateMany({ role: 'CITIZEN' }, { $set: { role: 'CONSUMER' } });
  await User.updateMany({ role: 'HELPER' }, { $set: { role: 'PROVIDER' } });

  const prevDemo = await getSetting('demoMode');
  await Settings.updateOne({ key: 'demoMode' }, { $set: { value: true } });

  let admin = await User.findOne({ role: 'ADMIN' });
  if (!admin) {
    admin = await ensureUser('admin@samadhan.local', 'Platform Admin', 'ADMIN', '9999999999', 'Admin@12345');
  }
  const actor = { userId: admin._id.toString(), role: 'ADMIN' };

  // Primary Demo Consumer (funded ₹2,500 for testing reports, pool contributions, and bookings)
  const primaryConsumer = await ensureUser('consumer@samadhan.local', 'Demo Consumer', 'CONSUMER', '9800000001', 'Demo@12345');
  const pcWallet = await Wallet.findOne({ userId: primaryConsumer._id });
  for (let k = 1; k <= 25 && (pcWallet?.balancePaise ?? 0) + (k - 1) * 10000 < 250000; k += 1) {
    try {
      await topupWallet(primaryConsumer._id, { amountPaise: 10000, idempotencyKey: `demo-primary-topup-${k}:${primaryConsumer._id}` });
    } catch {}
  }

  // Additional 12 consumers + 35 supporters
  const reporters = [primaryConsumer];
  for (let i = 1; i <= 12; i += 1) {
    reporters.push(await ensureUser(`demo.citizen${i}@example.org`, `Civic Reporter ${i}`, 'CONSUMER', `9000001${String(i).padStart(3, '0')}`));
  }
  const supporters = [];
  for (let i = 1; i <= 35; i += 1) {
    const u = await ensureUser(`demo.user${String(i).padStart(3, '0')}@example.org`, `Community Member ${i}`, 'CONSUMER', `9000002${String(i).padStart(3, '0')}`);
    const w = await Wallet.findOne({ userId: u._id });
    if ((w?.balancePaise ?? 0) < 100000) {
      for (let k = 1; k <= 10; k += 1) {
        try {
          await topupWallet(u._id, { amountPaise: 10000, idempotencyKey: `demo-topup-${k}:${u._id}` });
        } catch {}
      }
    }
    supporters.push(u);
  }

  // Seed Global Issues via real services
  const createdIssues = [];
  for (let i = 0; i < DEMO_ISSUES.length; i += 1) {
    const spec = DEMO_ISSUES[i];
    let issue = await Issue.findOne({
      $or: [
        { title: spec.title },
        ...(spec.titleHi ? [{ title: spec.titleHi }, { titleHi: spec.titleHi }] : []),
      ],
    }).lean();
    if (!issue) {
      const reporter = reporters[i % reporters.length];
      const res = await createIssue({
        reporterId: reporter._id,
        data: {
          title: spec.title,
          description: spec.description,
          language: 'en',
          titleHi: spec.titleHi,
          descriptionHi: spec.descriptionHi,
          category: spec.category,
          issueType: spec.issueType,
          importance: spec.importance,
          fundingGoalPaise: spec.fundingGoalPaise ?? 0,
          responsibleParty: spec.responsibleParty,
          location: { ...spec.location, country: 'India' },
          idempotencyKey: `demo-v3-issue:${i}`,
          force: true,
        },
      });
      issue = res.issue;
    }

    // Add supporters / pool contributions
    if (spec.issueType === 'POOL_FUNDS' && spec.contributions?.length) {
      for (let cIdx = 0; cIdx < spec.contributions.length; cIdx += 1) {
        try {
          await supportIssue({
            issueId: issue._id,
            userId: supporters[(i + cIdx) % supporters.length]._id,
            amountPaise: spec.contributions[cIdx],
            idempotencyKey: `demo-v3-pool:${i}:${cIdx}`,
          });
        } catch { /* idempotent or already supported */ }
      }
      if (spec.utilization?.length) {
        const fresh = await Issue.findById(issue._id).lean();
        if (!fresh.fundUtilization?.length) {
          for (const util of spec.utilization) {
            try {
              await addFundUtilization({ issueId: issue._id, actor, data: util });
            } catch { /* ignore */ }
          }
        }
      }
    } else if (spec.supporters) {
      let currentCount = await IssueSupport.countDocuments({ issueId: issue._id });
      for (let sIdx = 0; sIdx < supporters.length && currentCount < spec.supporters; sIdx += 1) {
        try {
          await supportIssue({
            issueId: issue._id,
            userId: supporters[(i + sIdx) % supporters.length]._id,
            idempotencyKey: `demo-v3-sup:${i}:${sIdx}`,
          });
          currentCount += 1;
        } catch { /* already supported */ }
      }
    }

    // Status & resolution
    const latest = await Issue.findById(issue._id).lean();
    if (spec.resolution && !latest.resolution?.organizationName) {
      try {
        await recordResolution({ issueId: issue._id, actor, data: spec.resolution });
      } catch (e) {
        console.warn('[seed:demo] resolution skipped:', e.message);
      }
    } else if (spec.status && spec.status !== latest.status && ['ACKNOWLEDGED', 'IN_PROGRESS'].includes(spec.status)) {
      try {
        if (latest.status === 'ACTIVE') await transitionIssue(issue._id, 'ACKNOWLEDGED', actor, 'Department acknowledged public issue');
        if (spec.status === 'IN_PROGRESS') await transitionIssue(issue._id, 'IN_PROGRESS', actor, 'Field inspection and repair crew assigned');
      } catch { /* ignore */ }
    }

    // Ensure bilingual fields on every seeded issue (whether newly created or pre-existing)
    const biSet = {
      issueLang: 'en',
      title: spec.title,
      description: spec.description,
      titleHi: spec.titleHi,
      descriptionHi: spec.descriptionHi,
      'location.address': spec.location.address,
      'location.addressHi': spec.location.addressHi || spec.location.address,
      'location.city': spec.location.city,
      'location.cityHi': spec.location.cityHi || spec.location.city,
    };
    if (spec.responsibleParty?.name) {
      biSet['responsibleParty.name'] = spec.responsibleParty.name;
      if (spec.responsibleParty.nameHi) biSet['responsibleParty.nameHi'] = spec.responsibleParty.nameHi;
    }
    if (spec.resolution) {
      if (spec.resolution.organizationNameHi) biSet['resolution.organizationNameHi'] = spec.resolution.organizationNameHi;
      if (spec.resolution.departmentOrLeadHi) biSet['resolution.departmentOrLeadHi'] = spec.resolution.departmentOrLeadHi;
      if (spec.resolution.resolutionDetailsHi) biSet['resolution.resolutionDetailsHi'] = spec.resolution.resolutionDetailsHi;
      if (spec.resolution.impactSummaryHi) biSet['resolution.impactSummaryHi'] = spec.resolution.impactSummaryHi;
    }
    await Issue.updateOne({ _id: issue._id }, { $set: biSet });

    createdIssues.push(await Issue.findById(issue._id).lean());
  }

  // Add realistic platform credit, authority reply & flag samples
  if (createdIssues[2]) {
    try { await platformCredit(createdIssues[2]._id, 500, 'Community awareness seed boost', 'demo-v3-credit:2', actor); } catch {}
  }
  if (createdIssues[0]) {
    try { await authorityReply(createdIssues[0]._id, 'BBMP Ward Engineer inspected the drain slab and scheduled replacement.', undefined, actor); } catch {}
  }

  // Backdate issue creation slightly over the past 21 days for chart shape
  for (let i = 0; i < createdIssues.length; i += 1) {
    const when = new Date(Date.now() - ((i * 2) % 21) * 24 * 60 * 60 * 1000);
    await Issue.collection.updateOne({ _id: createdIssues[i]._id }, { $set: { createdAt: when } });
  }

  // Seed Local Bookings & Platform Commission flows (covering real-world service categories + provider@samadhan.local)
  const providers = await Helper.find({
    verificationStatus: 'VERIFIED',
    isHidden: false,
    categories: { $nin: ['GENERAL_STORE', 'SWEETS_BAKERY'] },
  }).sort({ createdAt: 1 }).limit(18).lean();
  const bookingSeeds = [
    { title: 'Airport Cab Morning Pickup', slot: '07:00 AM - 09:00 AM', status: 'COMPLETED', rating: 5, review: 'On-time pickup, clean cab and transparent fare.' },
    { title: 'Deep Kitchen & Bathroom Cleaning', slot: '04:00 PM - 06:00 PM', status: 'COMPLETED', rating: 5, review: 'Spotless sink, tiles and sanitization finished on time.' },
    { title: 'Two-Wheeler Brake & Engine Tune-up', slot: '11:00 AM - 01:00 PM', status: 'COMPLETED', rating: 5, review: 'Smooth throttle response after service.' },
    { title: 'Main Door Smart Lock & Hinge Repair', slot: '04:00 PM - 06:00 PM', status: 'COMPLETED', rating: 4, review: 'Aligned door latch smoothly with zero noise.' },
    { title: 'Kitchen Sink Leak & Tap Replacement', slot: '09:00 AM - 11:00 AM', status: 'COMPLETED', rating: 5, review: 'Quick repair and neat finish.' },
    { title: 'Split AC Seasonal Jet Servicing', slot: '02:00 PM - 04:00 PM', status: 'COMPLETED', rating: 4, review: 'Thorough cooling coil wash and gas check.' },
    { title: 'Sofa & Upholstery Deep Cleaning', slot: '02:00 PM - 04:00 PM', status: 'COMPLETED', rating: 5, review: 'Stains removed cleanly and very polite team.' },
    { title: 'Evening Railway Station Cab Drop', slot: '06:00 PM - 08:00 PM', status: 'ACCEPTED', rating: 4, review: 'Confirmed immediately with clear pickup details.' },
    { title: 'Master Bedroom Damp Wall Waterproofing', slot: '09:00 AM - 11:00 AM', status: 'IN_PROGRESS', rating: 5, review: 'Clean putty finish and anti-fungal primer coat.' },
    { title: 'Car AC Blower & Filter Inspection', slot: '11:00 AM - 01:00 PM', status: 'PENDING' },
    { title: '1BHK Household Shifting & Packing', slot: '09:00 AM - 11:00 AM', status: 'PENDING' },
    { title: 'Ceiling Fan & Inverter Wiring Check', slot: '11:00 AM - 01:00 PM', status: 'PENDING' },
    { title: 'RO Membrane & Purifier Service', slot: '02:00 PM - 04:00 PM', status: 'ACCEPTED' },
    { title: 'Wardrobe Hinge & Latch Repair', slot: '04:00 PM - 06:00 PM', status: 'CANCELLED' },
  ];

  // Clean up any stale shop/bakery sample booking names if re-seeding an existing DB
  await Booking.deleteMany({
    idempotencyKey: { $regex: /^demo-booking-v3:/ },
    $or: [
      { category: { $in: ['GENERAL_STORE', 'SWEETS_BAKERY'] } },
      { serviceTitle: /Grocery|Mithai|Pantry|Cake/i },
    ],
  });

  for (let i = 0; i < bookingSeeds.length && providers.length > 0; i += 1) {
    const p = providers[i % providers.length];
    const bSpec = bookingSeeds[i];
    const consumer = i === 0 || i === 7 ? primaryConsumer : supporters[(i + 5) % supporters.length];
    const key = `demo-booking-v3:${i}`;
    let existing = await Booking.findOne({ idempotencyKey: key }).lean();
    if (!existing) {
      try {
        const res = await createBooking({
          consumerId: consumer._id,
          data: {
            helperId: String(p._id),
            category: p.categories[0],
            serviceTitle: bSpec.title,
            scheduledDate: new Date(Date.now() + (i + 1) * 86400000).toISOString().slice(0, 10),
            timeSlot: bSpec.slot,
            serviceAddress: {
              address: `Flat ${101 + i}, Residency Enclave`,
              city: p.serviceLocation?.city || 'Bengaluru',
              state: p.serviceLocation?.state || 'Karnataka',
              pincode: p.serviceLocation?.pincode || '560001',
            },
            notes: 'Please call upon arrival at the main gate.',
            amountPaise: p.basePricePaise || 29900,
            idempotencyKey: key,
          },
        });
        existing = res.booking;
      } catch (e) {
        console.warn('[seed:demo] booking create skipped:', e.message);
      }
    }

    if (existing && existing.status === 'PENDING' && bSpec.status !== 'PENDING') {
      const providerActor = { actorId: p.userId, actorRole: 'PROVIDER' };
      try {
        if (bSpec.status === 'CANCELLED') {
          await transitionBooking({ bookingId: existing._id, actorId: consumer._id, actorRole: 'CONSUMER', nextStatus: 'CANCELLED', note: 'Schedule changed' });
        } else {
          await transitionBooking({ bookingId: existing._id, actorId: providerActor.actorId, actorRole: 'PROVIDER', nextStatus: 'ACCEPTED', note: 'Booking confirmed' });
          if (bSpec.status === 'IN_PROGRESS' || bSpec.status === 'COMPLETED') {
            await transitionBooking({ bookingId: existing._id, actorId: providerActor.actorId, actorRole: 'PROVIDER', nextStatus: 'IN_PROGRESS', note: 'Provider on the way' });
          }
          if (bSpec.status === 'COMPLETED') {
            await transitionBooking({ bookingId: existing._id, actorId: providerActor.actorId, actorRole: 'PROVIDER', nextStatus: 'COMPLETED', note: 'Service completed cleanly' });
          }
        }
      } catch (e) {
        console.warn('[seed:demo] booking transition skipped:', e.message);
      }
    }

    if (bSpec.rating) {
      try {
        await connectHelper({ seekerId: consumer._id, helperId: p._id });
      } catch {}
      try {
        await upsertReview({ seekerId: consumer._id, helperId: p._id, rating: bSpec.rating, comment: bSpec.review });
      } catch {}
    }
  }

  // Ensure primaryConsumer retains >= ₹2,500 available wallet balance for demo bookings & reports
  const refreshedPc = await Wallet.findOne({ userId: primaryConsumer._id }).lean();
  let curBal = refreshedPc?.balancePaise ?? 0;
  for (let topIdx = 0; topIdx < 15 && curBal < 250000; topIdx += 1) {
    try {
      const r = await topupWallet(primaryConsumer._id, {
        amountPaise: 10000,
        idempotencyKey: `demo-primary-replenish-${topIdx}:${primaryConsumer._id}`,
      });
      curBal = r.wallet?.balancePaise ?? curBal + 10000;
    } catch {
      curBal += 10000;
    }
  }

  await Settings.updateOne({ key: 'demoMode' }, { $set: { value: prevDemo } });
  console.log(`[seed:demo] ensured ${createdIssues.length} global issues across Indian states, ${bookingSeeds.length} local bookings, demo consumers & providers.`);
  await disconnectDB();
}

seed().catch(async (e) => {
  console.error('[seed:demo] failed:', e.message);
  await disconnectDB().catch(() => {});
  process.exit(1);
});
