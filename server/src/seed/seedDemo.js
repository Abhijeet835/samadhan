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
    description: 'Two concrete storm-drain slabs have caved in right beside the bus stop, creating a dangerous open drop for pedestrians and two-wheelers during evening rush hour.',
    category: 'BROKEN_ROADS',
    issueType: 'SOCIAL_EXPLOSION',
    importance: 'SMALL',
    location: { coordinates: [77.6412, 12.9718], address: '100 Feet Road, Indiranagar', city: 'Bengaluru', state: 'Karnataka', pincode: '560038' },
    supporters: 5,
    status: 'ACKNOWLEDGED',
  },
  // 2. Social Explosion — MEDIUM (Reached -> Triggers IG + X campaign)
  {
    title: 'Severe waterlogging and sewage overflow across Dadar East lanes',
    description: 'Blocked underground stormwater lines have caused untreated sewage to back up onto residential streets for five consecutive days, affecting school commuters and ground-floor shops.',
    category: 'SEWAGE_DRAINAGE',
    issueType: 'SOCIAL_EXPLOSION',
    importance: 'MEDIUM',
    location: { coordinates: [72.8432, 19.0178], address: 'Naigaon Cross Road, Dadar East', city: 'Mumbai', state: 'Maharashtra', pincode: '400014' },
    supporters: 8,
    status: 'IN_PROGRESS',
  },
  // 3. Social Explosion — LARGE (Not reached yet — national public facility demand)
  {
    title: 'Need for AIIMS-grade tertiary medical & trauma centre in Southern Jharkhand',
    description: 'Patients across Ranchi, Khunti, and Simdega currently travel hundreds of kilometres for specialized oncology and trauma care. Citizens urge state and central planners to prioritize a regional AIIMS/super-specialty campus.',
    category: 'PUBLIC_FACILITIES',
    issueType: 'SOCIAL_EXPLOSION',
    importance: 'LARGE',
    location: { coordinates: [85.3096, 23.3441], address: 'Kanke Road Civic Zone', city: 'Ranchi', state: 'Jharkhand', pincode: '834008' },
    supporters: 7,
    status: 'ACTIVE',
  },
  // 4. Social Explosion — LARGE (Reached -> High-impact public campaign)
  {
    title: 'Demand for dedicated IIT / Technical Innovation Campus in North-East Corridor',
    description: 'Students from Assam and neighbouring states face limited seat capacity in premier engineering and research institutions. Expanding technical higher-education infrastructure will unlock regional innovation.',
    category: 'EDUCATION_INFRA',
    issueType: 'SOCIAL_EXPLOSION',
    importance: 'LARGE',
    location: { coordinates: [91.7362, 26.1445], address: 'Jalukbari Academic Zone', city: 'Guwahati', state: 'Assam', pincode: '781014' },
    supporters: 13,
    status: 'ACKNOWLEDGED',
  },
  // 5. Pool Funds — In Progress (Stray Animal Rescue)
  {
    title: 'Emergency rescue, surgery and vaccination for injured stray dogs in Rohini Sector 7',
    description: 'Six community stray dogs suffered highway injuries and untreated infections near Sector 7 market. Local volunteers and a partner veterinary NGO are pooling funds for trauma surgery, sterilization, and anti-rabies shots.',
    category: 'STRAY_ANIMALS',
    issueType: 'POOL_FUNDS',
    importance: 'SMALL',
    fundingGoalPaise: 4000,
    responsibleParty: { type: 'NGO', name: 'Paws & Hope Animal Welfare Foundation', contactRole: 'Lead Vet Coordinator', note: 'Daily treatment logs shared with contributors' },
    contributions: [800, 1000, 700],
    utilization: [
      { item: 'Emergency vet X-ray & wound dressing', amountPaise: 1200, note: 'Completed for 3 dogs at Sector 7 clinic' },
      { item: 'Anti-rabies & antibiotic course', amountPaise: 900, note: '14-day medicine stock procured' },
    ],
    location: { coordinates: [77.118, 28.711], address: 'Sector 7 Market Park, Rohini', city: 'New Delhi', state: 'Delhi', pincode: '110085' },
    status: 'IN_PROGRESS',
  },
  // 6. Pool Funds — Goal Reached & Solved by NGO (Promoted!)
  {
    title: 'Community-funded solar streetlights and safe rescue shelter in Gomti Nagar',
    description: 'Dark pedestrian alleys behind the vegetable mandi caused accidents and unsafe night crossings. Community members pooled funds with an environmental NGO to install solar LED poles.',
    category: 'WATER_ELECTRICITY',
    issueType: 'POOL_FUNDS',
    importance: 'MEDIUM',
    fundingGoalPaise: 5000,
    responsibleParty: { type: 'NGO', name: 'Roshni Clean Energy Collective', contactRole: 'Project Lead', note: '8-pole solar installation complete' },
    contributions: [1500, 2000, 1500],
    utilization: [
      { item: '8 Solar LED poles & LiFePO4 batteries', amountPaise: 3800, note: 'Procured from certified supplier' },
      { item: 'Pole erection & electrician labour', amountPaise: 1200, note: 'Completed across 450 m stretch' },
    ],
    resolution: {
      solverType: 'NGO',
      organizationName: 'Roshni Clean Energy Collective',
      departmentOrLead: 'Rural & Urban Microgrid Team',
      resolutionDetails: 'Installed 8 dusk-to-dawn solar LED poles with 3-year maintenance warranty funded by neighbourhood contributors.',
      impactSummary: '450 m market lane illuminated every night; zero night-time accidents reported since installation.',
      promotion: {
        enabled: true,
        tagline: 'Powering safer Indian neighbourhoods with clean solar infrastructure',
        badgeText: 'Verified Civic NGO Partner',
        websiteUrl: 'https://example.org/roshni-collective',
      },
    },
    location: { coordinates: [80.996, 26.854], address: 'Patrakar Puram Lane, Gomti Nagar', city: 'Lucknow', state: 'Uttar Pradesh', pincode: '226010' },
    status: 'RESOLVED',
  },
  // 7. Resolved by Government Department
  {
    title: 'Deep potholes and damaged culvert on Malviya Nagar Main Avenue',
    description: 'Monsoon erosion tore away a 180-metre stretch near the school gate, causing daily traffic bottlenecks and two-wheeler skids.',
    category: 'BROKEN_ROADS',
    issueType: 'SOCIAL_EXPLOSION',
    importance: 'MEDIUM',
    location: { coordinates: [75.812, 26.855], address: 'Main Avenue, Malviya Nagar', city: 'Jaipur', state: 'Rajasthan', pincode: '302017' },
    supporters: 7,
    resolution: {
      solverType: 'GOVERNMENT',
      organizationName: 'Jaipur Municipal Corporation (JMC Greater)',
      departmentOrLead: 'Public Works & Road Maintenance Wing',
      resolutionDetails: 'Resurfaced the 180-metre stretch with hot-mix bitumen and reinforced the storm culvert grating.',
      impactSummary: 'Smooth two-lane commute restored for ~6,000 daily commuters and school buses.',
    },
    status: 'RESOLVED',
  },
  // 8. Resolved by Private Company (CSR Recognition & Promotion!)
  {
    title: 'Smart waste segregation kiosks & daily collection bins at T. Nagar Market',
    description: 'Overflowing open garbage dumps beside the textile bazaar created foul odour and blocked footpaths.',
    category: 'GARBAGE_MANAGEMENT',
    issueType: 'SOCIAL_EXPLOSION',
    importance: 'SMALL',
    location: { coordinates: [80.2337, 13.0418], address: 'Usman Road Junction, T. Nagar', city: 'Chennai', state: 'Tamil Nadu', pincode: '600017' },
    supporters: 5,
    resolution: {
      solverType: 'PRIVATE_ORG',
      organizationName: 'Apex GreenInfra Pvt. Ltd.',
      departmentOrLead: 'CSR Clean Cities Initiative',
      resolutionDetails: 'Sponsored and installed 6 twin-bin stainless segregation stations with IoT fill alerts linked to local sanitation crews.',
      impactSummary: '1.2 tonnes/day dry-wet waste segregated at source; footpath cleared completely.',
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
    description: 'Residents requested humane Animal Birth Control (ABC) and anti-rabies vaccination camps near Sector II parks.',
    category: 'STRAY_ANIMALS',
    issueType: 'SOCIAL_EXPLOSION',
    importance: 'SMALL',
    location: { coordinates: [88.414, 22.586], address: 'Sector II Central Park, Salt Lake', city: 'Kolkata', state: 'West Bengal', pincode: '700091' },
    supporters: 4,
    resolution: {
      solverType: 'NGO',
      organizationName: 'Paws & Hope Animal Welfare Foundation',
      departmentOrLead: 'Urban ABC & Vaccination Unit',
      resolutionDetails: 'Conducted a 4-day humane vaccination & sterilization drive covering 34 community dogs with collar tagging.',
      impactSummary: '34 stray dogs vaccinated and sterilized; zero bite complaints over the past month.',
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
    description: 'Broken asphalt and missing reflective strips around the primary school gate cause frequent falls during rains. Residents are pooling funds for concrete patching and zebra markings.',
    category: 'BROKEN_ROADS',
    issueType: 'POOL_FUNDS',
    importance: 'SMALL',
    fundingGoalPaise: 3000,
    responsibleParty: { type: 'PRIVATE_ORG', name: 'Patna Civic Builders Guild', contactRole: 'Volunteer Civil Engineer', note: 'Materials cost only; labour volunteered' },
    contributions: [500, 600],
    utilization: [
      { item: 'Cold-mix asphalt bags & reflective road paint', amountPaise: 1100, note: 'First batch ordered' },
    ],
    location: { coordinates: [85.161, 25.596], address: 'Kankarbagh Main Road', city: 'Patna', state: 'Bihar', pincode: '800020' },
    status: 'ACTIVE',
  },
  // 11. Hindi Issue — Social Explosion (SMALL, Not reached yet)
  {
    title: 'एमजी रोड बस स्टॉप के पास कचरे और सीवेज की गंभीर समस्या',
    description: 'पिछले दो सप्ताह से कचरा न उठने और नाली जाम होने के कारण पैदल यात्रियों और दुकानदारों को भारी परेशानी हो रही है।',
    category: 'GARBAGE_MANAGEMENT',
    issueType: 'SOCIAL_EXPLOSION',
    importance: 'SMALL',
    location: { coordinates: [77.607, 12.975], address: 'एमजी रोड बस स्टॉप', city: 'Bengaluru', state: 'Karnataka', pincode: '560001' },
    supporters: 2,
    status: 'ACTIVE',
  },
  // 12. Hindi Issue — Pool Funds (Active)
  {
    title: 'सरकारी स्कूल के बच्चों के लिए स्वच्छ पेयजल और आरओ फिल्टर पहल',
    description: 'स्थानीय प्राथमिक विद्यालय में पेयजल व्यवस्था खराब होने से बच्चों को परेशानी हो रही है। समुदाय द्वारा स्वच्छ पानी के लिए फंड एकत्र किया जा रहा है।',
    category: 'EDUCATION_INFRA',
    issueType: 'POOL_FUNDS',
    importance: 'MEDIUM',
    fundingGoalPaise: 6000,
    responsibleParty: { type: 'NGO', name: 'Vidya Setu Rural Education NGO', contactRole: 'School Infrastructure Coordinator' },
    contributions: [1000, 1200],
    location: { coordinates: [77.4126, 23.2599], address: 'अरेरा कॉलोनी स्कूल रोड', city: 'Bhopal', state: 'Madhya Pradesh', pincode: '462016' },
    status: 'ACTIVE',
  },
  // 13. Extra State coverage: Telangana (Hyderabad)
  {
    title: 'Frequent voltage fluctuations and exposed transformer cables in Madhapur',
    description: 'Low-hanging live distribution wires outside residential apartments pose an electrical fire hazard during windy evenings.',
    category: 'WATER_ELECTRICITY',
    issueType: 'SOCIAL_EXPLOSION',
    importance: 'MEDIUM',
    location: { coordinates: [78.3915, 17.4486], address: 'Ayyappa Society Road, Madhapur', city: 'Hyderabad', state: 'Telangana', pincode: '500081' },
    supporters: 6,
    status: 'ACTIVE',
  },
  // 14. Extra State coverage: Gujarat (Ahmedabad)
  {
    title: 'Clean drinking water contamination alerts in Vatva industrial belt',
    description: 'Residents report discoloured tap water every morning and demand immediate pipeline flushing and quality testing.',
    category: 'WATER_ELECTRICITY',
    issueType: 'SOCIAL_EXPLOSION',
    importance: 'LARGE',
    location: { coordinates: [72.634, 22.961], address: 'Vatva GIDC Phase II', city: 'Ahmedabad', state: 'Gujarat', pincode: '382445' },
    supporters: 13,
    status: 'ACKNOWLEDGED',
  },
  // 15. Extra UT coverage: Chandigarh
  {
    title: 'Dedicated cycle-track lighting and signage upgrade in Sector 17–22 corridor',
    description: 'Missing solar studs and faded pedestrian markings reduce evening safety along the Sector 17–22 cycling lane.',
    category: 'PUBLIC_FACILITIES',
    issueType: 'SOCIAL_EXPLOSION',
    importance: 'SMALL',
    location: { coordinates: [76.7794, 30.7333], address: 'Jan Marg Sector 17', city: 'Chandigarh', state: 'Chandigarh', pincode: '160017' },
    supporters: 3,
    status: 'ACTIVE',
  },
  // 16. Extra UT coverage: Jammu & Kashmir
  {
    title: 'Winter drainage de-silting required along Residency Road commercial stretch',
    description: 'Blocked roadside culverts freeze and flood pedestrian sidewalks after light snowfall and rain.',
    category: 'SEWAGE_DRAINAGE',
    issueType: 'SOCIAL_EXPLOSION',
    importance: 'MEDIUM',
    location: { coordinates: [74.812, 34.072], address: 'Residency Road, Lal Chowk', city: 'Srinagar', state: 'Jammu and Kashmir', pincode: '190001' },
    supporters: 4,
    status: 'ACTIVE',
  },
  // 17. Extra State coverage: Kerala (Kochi)
  {
    title: 'Canal desilting and mosquito control ahead of monsoon in Ernakulam',
    description: 'Plastic accumulation in Perandoor canal narrows water flow and increases vector-borne illness risk.',
    category: 'GARBAGE_MANAGEMENT',
    issueType: 'SOCIAL_EXPLOSION',
    importance: 'MEDIUM',
    location: { coordinates: [76.299, 9.981], address: 'Kaloor-Kadavanthra Link', city: 'Kochi', state: 'Kerala', pincode: '682017' },
    supporters: 6,
    resolution: {
      solverType: 'GOVERNMENT',
      organizationName: 'Kochi Municipal Corporation',
      departmentOrLead: 'Health & Canal Sanitation Wing',
      resolutionDetails: 'Deployed amphibious weed harvester and removed 14 tonnes of plastic silt from 1.2 km canal section.',
      impactSummary: 'Restored free stormwater drainage across 4 wards ahead of peak rains.',
    },
    status: 'RESOLVED',
  },
  // 18. Extra State coverage: Odisha (Bhubaneswar)
  {
    title: 'Upgrade rural science labs and smart classrooms in Khordha block schools',
    description: 'High school students lack basic chemistry/physics lab kits and stable broadband connectivity for board exam preparation.',
    category: 'EDUCATION_INFRA',
    issueType: 'SOCIAL_EXPLOSION',
    importance: 'LARGE',
    location: { coordinates: [85.8245, 20.2961], address: 'Unit 4 Academic Circle', city: 'Bhubaneswar', state: 'Odisha', pincode: '751001' },
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
    let issue = await Issue.findOne({ title: spec.title }).lean();
    if (!issue) {
      const reporter = reporters[i % reporters.length];
      const res = await createIssue({
        reporterId: reporter._id,
        data: {
          title: spec.title,
          description: spec.description,
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

  // Seed Local Bookings & Platform Commission flows (covering all 7 categories + provider@samadhan.local)
  const providers = await Helper.find({ verificationStatus: 'VERIFIED', isHidden: false }).sort({ createdAt: 1 }).limit(14).lean();
  const bookingSeeds = [
    { title: 'Airport Cab Morning Pickup', slot: '07:00 AM - 08:30 AM', status: 'COMPLETED', rating: 5, review: 'On-time pickup, clean cab and transparent fare.' },
    { title: 'Monthly Grocery Bundle Delivery', slot: '05:00 PM - 07:00 PM', status: 'COMPLETED', rating: 5, review: 'Fresh items packed neatly with quick delivery.' },
    { title: 'Two-Wheeler Brake & Engine Tune-up', slot: '11:00 AM - 01:00 PM', status: 'COMPLETED', rating: 5, review: 'Smooth throttle response after service.' },
    { title: 'Festival Mithai Gift Box Order', slot: '04:00 PM - 06:00 PM', status: 'COMPLETED', rating: 4, review: 'Authentic taste and hygienic packaging.' },
    { title: 'Kitchen Sink Leak & Tap Replacement', slot: '10:00 AM - 12:00 PM', status: 'COMPLETED', rating: 5, review: 'Quick repair and neat finish.' },
    { title: 'Split AC Seasonal Servicing', slot: '02:00 PM - 04:00 PM', status: 'COMPLETED', rating: 4, review: 'Thorough cooling coil wash and gas check.' },
    { title: 'Sofa Deep Cleaning Slot', slot: '03:00 PM - 05:00 PM', status: 'COMPLETED', rating: 5, review: 'Stains removed cleanly and very polite team.' },
    { title: 'Evening Railway Station Cab Drop', slot: '06:00 PM - 08:00 PM', status: 'ACCEPTED', rating: 4, review: 'Confirmed immediately with clear pickup details.' },
    { title: 'Weekly Pantry & Dairy Basket', slot: '09:00 AM - 11:00 AM', status: 'IN_PROGRESS', rating: 5, review: 'Very reliable neighbourhood store.' },
    { title: 'Car AC Blower & Filter Inspection', slot: '11:00 AM - 01:00 PM', status: 'PENDING' },
    { title: 'Custom Birthday Cake Pre-order', slot: '04:00 PM - 06:00 PM', status: 'PENDING' },
    { title: 'Ceiling Fan & Inverter Wiring Check', slot: '11:00 AM - 01:00 PM', status: 'PENDING' },
    { title: 'RO Membrane & Purifier Service', slot: '02:00 PM - 04:00 PM', status: 'ACCEPTED' },
    { title: 'Wardrobe Hinge & Latch Repair', slot: '03:00 PM - 05:00 PM', status: 'CANCELLED' },
  ];

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
