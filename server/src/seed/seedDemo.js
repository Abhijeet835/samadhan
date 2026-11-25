// Rich demo data — ALL via real services so invariants hold. Idempotent by
// deterministic emails/titles. NEVER sends email/webhook/social: external
// integration env vars are blanked BEFORE any config import (dotenv won't
// override existing vars), then services are imported dynamically.
for (const k of ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASS', 'N8N_WEBHOOK_URL', 'N8N_WEBHOOK_SECRET', 'TELEGRAM_BOT_TOKEN', 'TELEGRAM_CHAT_ID', 'BUFFER_API_KEY', 'BUFFER_CHANNEL_X', 'BUFFER_CHANNEL_FB', 'BUFFER_CHANNEL_IG', 'UPLOAD_POST_API_KEY', 'REDDIT_CLIENT_ID', 'REDDIT_CLIENT_SECRET', 'REDDIT_REFRESH_TOKEN', 'GEMINI_API_KEY', 'DISPATCH_OVERRIDE_TO']) {
  process.env[k] = '';
}
process.env.ENABLE_CRON = 'false';

const RESET = process.argv.includes('--reset');

const { connectDB, disconnectDB } = await import('../config/db.js');
const { default: mongoose } = await import('mongoose');
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
const { default: SocialPost } = await import('../modules/social/socialPost.model.js');
const { default: DispatchLog } = await import('../modules/dispatch/dispatchLog.model.js');
const { default: Notification } = await import('../modules/notifications/notification.model.js');
const { default: Settings } = await import('../modules/wallet/settings.model.js');
const { ensureDefaultSettings, ensureWallet, topupWallet, getSetting } = await import('../modules/wallet/wallet.service.js');
const { createIssue, supportIssue, transitionIssue } = await import('../modules/issues/issue.service.js');
const { registerHelper, connectHelper, upsertReview, adminPatchHelper } = await import('../modules/helpers/helper.service.js');
const { platformCredit, authorityReply } = await import('../modules/admin/admin.service.js');
const { guardDemoSeed } = await import('./seedGuard.util.js');
const bcrypt = (await import('bcrypt')).default;

guardDemoSeed();

const CITIES = [
  { city: 'Bengaluru', state: 'Karnataka', pincode: '560001', centre: [77.5946, 12.9716] },
  { city: 'Mumbai', state: 'Maharashtra', pincode: '400001', centre: [72.8777, 19.076] },
  { city: 'Delhi', state: 'Delhi', pincode: '110001', centre: [77.209, 28.6139] },
];
const CATS = ['ROAD', 'GARBAGE', 'WATER', 'STREETLIGHT', 'SEWAGE', 'ELECTRICITY', 'PARK', 'OTHER'];
const HINDI = [
  ['एमजी रोड पर टूटी स्ट्रीटलाइट', 'एमजी रोड बस स्टॉप के पास की स्ट्रीटलाइट दो सप्ताह से बंद है, जिससे रात में रास्ता असुरक्षित हो गया है।'],
  ['कोरमंगला में कचरे का ढेर', 'पार्क के प्रवेश द्वार पर दस दिनों से कचरा जमा है, जिससे बदबू और मच्छर बढ़ रहे हैं।'],
  ['एचएसआर लेआउट में जलभराव', 'हर बारिश के बाद नाला जाम होने से चौराहा भर जाता है और पैदल यात्रियों को सड़क पर चलना पड़ता है।'],
  ['अंधेरी में पानी की किल्लत', 'पिछले एक सप्ताह से सुबह केवल एक घंटे पानी आ रहा है, जिससे निवासियों को बहुत परेशानी हो रही है।'],
  ['कनॉट प्लेस में गड्ढे', 'मुख्य सड़क पर बड़े-बड़े गड्ढे हो गए हैं, जिससे दुर्घटना का खतरा बना रहता है।'],
  ['दादर में सीवेज ओवरफ्लो', 'नाला ओवरफ्लो होकर गली में गंदा पानी भर रहा है, जिससे स्वास्थ्य का खतरा है।'],
];

async function ensureUser(email, name, role, phone) {
  let u = await User.findOne({ email });
  if (!u) {
    u = await User.create({ name, email, phone, password: await bcrypt.hash('Demo@12345', 10), role, language: 'en' });
    await ensureWallet(u._id);
  }
  return u;
}

async function reset() {
  const demoUsers = await User.find({ email: /@example\.org$/, role: { $ne: 'ADMIN' } }).select('_id').lean();
  const ids = demoUsers.map((u) => u._id);
  const demoIssues = await Issue.find({ reporterId: { $in: ids } }).select('_id').lean();
  const issueIds = demoIssues.map((i) => i._id);
  await Notification.deleteMany({ userId: { $in: ids } });
  await SocialPost.deleteMany({ issueId: { $in: issueIds } });
  await DispatchLog.deleteMany({ issueId: { $in: issueIds } });
  await IssueFlag.deleteMany({ issueId: { $in: issueIds } });
  await IssueUpdate.deleteMany({ issueId: { $in: issueIds } });
  await IssueSupport.deleteMany({ issueId: { $in: issueIds } });
  await Issue.deleteMany({ _id: { $in: issueIds } });
  await Connection.deleteMany({ seekerId: { $in: ids } });
  await Review.deleteMany({ seekerId: { $in: ids } });
  await WalletTxn.deleteMany({ userId: { $in: ids } });
  await Wallet.deleteMany({ userId: { $in: ids } });
  await User.deleteMany({ _id: { $in: ids } });
  console.log('[seed:demo] reset removed demo data (admin/helper seeds/authorities/auditLogs untouched).');
}

async function seed() {
  await connectDB();
  await ensureDefaultSettings();
  if (RESET) { await reset(); await disconnectDB(); return; }

  const prevDemo = await getSetting('demoMode');
  await Settings.updateOne({ key: 'demoMode' }, { $set: { value: true } });

  const admin = await User.findOne({ role: 'ADMIN' });
  const actor = { userId: admin._id.toString(), role: 'ADMIN' };

  // 12 reporters + 60 supporters
  const reporters = [];
  for (let i = 1; i <= 12; i += 1) {
    reporters.push(await ensureUser(`demo.citizen${i}@example.org`, `Demo Citizen ${i}`, 'CITIZEN', `9000001${String(i).padStart(3, '0')}`));
  }
  const supporters = [];
  for (let i = 1; i <= 60; i += 1) {
    const u = await ensureUser(`demo.user${String(i).padStart(3, '0')}@example.org`, `Demo Supporter ${i}`, 'CITIZEN', `9000002${String(i).padStart(3, '0')}`);
    const w = await Wallet.findOne({ userId: u._id });
    if (w.balancePaise < 20000) await topupWallet(u._id, { amountPaise: 20000, idempotencyKey: `demo-topup:${u._id}` });
    supporters.push(u);
  }

  // 36 issues (idempotent by title)
  const issues = [];
  for (let i = 0; i < 36; i += 1) {
    const cat = CATS[i % 8];
    const cityInfo = CITIES[i < 24 ? 0 : i < 30 ? 1 : 2];
    const hindi = i < 6 ? HINDI[i] : null;
    const title = hindi ? hindi[0] : `${cat.charAt(0) + cat.slice(1).toLowerCase()} problem #${i + 1} at ${cityInfo.city} ward ${i + 1}`;
    const existing = await Issue.findOne({ title });
    if (existing) { issues.push(existing); continue; }
    const reporter = reporters[i % 12];
    const jitter = () => (Math.random() - 0.5) * 0.03;
    const { issue } = await createIssue({
      reporterId: reporter._id,
      data: {
        title,
        description: hindi ? hindi[1] : `Residents report a recurring ${cat.toLowerCase()} problem here that has persisted for weeks and needs municipal attention urgently.`,
        category: cat,
        location: { coordinates: [cityInfo.centre[0] + jitter(), cityInfo.centre[1] + jitter()], address: `Demo Street ${i + 1}`, city: cityInfo.city, state: cityInfo.state, pincode: cityInfo.pincode },
        idempotencyKey: `demo-issue:${i}`,
        force: true,
      },
    });
    issues.push(issue);
  }

  // Fund distribution: supports to reach tiers (demo ₹20/₹50). ~12 low, ~8 mid,
  // 6 tier1, 4 tier2, 3 at ₹19, 2 at ₹49.
  const targets = [
    ...Array(12).fill(200), ...Array(8).fill(1000),
    ...Array(6).fill(2200), ...Array(4).fill(5200),
    ...Array(3).fill(1900), ...Array(2).fill(4900),
  ];
  for (let i = 0; i < issues.length; i += 1) {
    const iss = issues[i];
    const target = targets[i] ?? 300;
    let sup = await IssueSupport.countDocuments({ issueId: iss._id });
    let sIdx = i;
    while (sup * 100 + 500 < target && sIdx < supporters.length + i) {
      const u = supporters[(sIdx) % supporters.length];
      try { await supportIssue({ issueId: iss._id, userId: u._id, idempotencyKey: `demo-sup:${i}:${sIdx}` }); } catch { /* already supported */ }
      sup = await IssueSupport.countDocuments({ issueId: iss._id });
      sIdx += 1;
      if (sIdx - i > 60) break;
    }
  }

  // Statuses via transitionIssue
  const statusPlan = { 5: 'ACKNOWLEDGED', 6: 'IN_PROGRESS', 7: 'RESOLVED', 8: 'CLOSED', 30: 'REJECTED', 31: 'REJECTED' };
  for (const [idx, status] of Object.entries(statusPlan)) {
    const iss = issues[Number(idx)];
    if (!iss) continue;
    try {
      if (status === 'IN_PROGRESS' || status === 'RESOLVED' || status === 'CLOSED') await transitionIssue(iss._id, 'ACKNOWLEDGED', actor, 'demo acknowledge');
      if (status === 'RESOLVED' || status === 'CLOSED') await transitionIssue(iss._id, 'IN_PROGRESS', actor, 'demo in progress');
      if (status === 'CLOSED') { await transitionIssue(iss._id, 'RESOLVED', actor, 'demo resolved'); }
      if (status === 'REJECTED') await transitionIssue(iss._id, 'REJECTED', actor, 'demo rejection spam');
      else if (status !== 'CLOSED') await transitionIssue(iss._id, status, actor, `demo ${status}`);
    } catch { /* already in target/terminal */ }
  }

  // 2 platform credits, 2 authority replies, 3 flags
  try { await platformCredit(issues[0]._id, 1000, 'Demo community boost', 'demo-credit:0', actor); } catch {}
  try { await platformCredit(issues[1]._id, 500, 'Demo pilot grant', 'demo-credit:1', actor); } catch {}
  try { await authorityReply(issues[2]._id, 'Work has been scheduled for next week by the department.', undefined, actor); } catch {}
  try { await authorityReply(issues[3]._id, 'Inspection completed; repair crew assigned.', undefined, actor); } catch {}
  for (let i = 0; i < 3; i += 1) {
    try { await IssueFlag.create({ issueId: issues[10 + i]._id, userId: supporters[i]._id, reason: 'SPAM', comment: 'demo flag' }); } catch {}
  }

  // 15 helper connections + 10 reviews from demo citizens
  const helpers = await Helper.find({ isSample: true }).limit(8).lean();
  for (let i = 0; i < 15 && helpers.length; i += 1) {
    const h = helpers[i % helpers.length];
    const u = supporters[i];
    try { await connectHelper({ seekerId: u._id, helperId: h._id }); } catch {}
    if (i < 10) { try { await upsertReview({ seekerId: u._id, helperId: h._id, rating: (i % 5) + 1, comment: 'Demo review of the sample helper service.' }); } catch {} }
  }

  // Backdate createdAt over last 30 days (timestamps only) for chart shape
  for (let i = 0; i < issues.length; i += 1) {
    const when = new Date(Date.now() - (i % 30) * 24 * 60 * 60 * 1000);
    await Issue.collection.updateOne({ _id: issues[i]._id }, { $set: { createdAt: when } });
    await IssueSupport.collection.updateMany({ issueId: issues[i]._id }, { $set: { createdAt: when } });
    await IssueUpdate.collection.updateMany({ issueId: issues[i]._id }, { $set: { createdAt: when } });
    await WalletTxn.collection.updateMany({ issueId: issues[i]._id }, { $set: { createdAt: when } });
  }

  await Settings.updateOne({ key: 'demoMode' }, { $set: { value: prevDemo } });
  console.log(`[seed:demo] created/ensured ${issues.length} issues, ${reporters.length} reporters, ${supporters.length} supporters; demoMode restored to ${prevDemo}.`);
  await disconnectDB();
}

seed().catch(async (e) => { console.error('[seed:demo] failed:', e.message); await disconnectDB().catch(() => {}); process.exit(1); });
