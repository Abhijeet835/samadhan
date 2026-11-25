// Data-integrity verifier. Exits non-zero on any violation. Reusable:
// `verifyData()` returns { ok, violations, summary }; CLI runs it after connect.
import mongoose from 'mongoose';
import Wallet from '../modules/wallet/wallet.model.js';
import WalletTxn from '../modules/wallet/walletTxn.model.js';
import Issue from '../modules/issues/issue.model.js';
import IssueSupport from '../modules/issues/issueSupport.model.js';
import IssueUpdate from '../modules/issues/issueUpdate.model.js';
import Helper from '../modules/helpers/helper.model.js';
import Connection from '../modules/helpers/connection.model.js';
import Review from '../modules/helpers/review.model.js';
import AuditLog from '../modules/tiers/auditLog.model.js';
import DispatchLog from '../modules/dispatch/dispatchLog.model.js';
import SocialPost from '../modules/social/socialPost.model.js';
import Notification from '../modules/notifications/notification.model.js';
import Booking from '../modules/bookings/booking.model.js';

export async function verifyData() {
  const violations = [];
  const summary = {};

  // 1. wallet balance = Σ txns, never negative
  const wallets = await Wallet.find().lean();
  const txnSums = await WalletTxn.aggregate([{ $group: { _id: '$userId', total: { $sum: '$amountPaise' } } }]);
  const sumMap = new Map(txnSums.map((t) => [String(t._id), t.total]));
  for (const w of wallets) {
    const sum = sumMap.get(String(w.userId)) ?? 0;
    if (w.balancePaise !== sum) violations.push(`wallet ${w.userId}: balance ${w.balancePaise} ≠ Σtxns ${sum}`);
    if (w.balancePaise < 0) violations.push(`wallet ${w.userId}: negative balance`);
  }
  summary.wallets = wallets.length;

  // 2. issue fund = Σ supports + platformCredit; supporterCount; tier; refunds
  const issues = await Issue.find().lean();
  const supportAgg = await IssueSupport.aggregate([{ $group: { _id: '$issueId', total: { $sum: '$amountPaise' }, count: { $sum: 1 } } }]);
  const supMap = new Map(supportAgg.map((s) => [String(s._id), s]));
  for (const iss of issues) {
    const sup = supMap.get(String(iss._id)) ?? { total: 0, count: 0 };
    const credit = iss.platformCreditPaise ?? 0;
    if (iss.status === 'REJECTED') {
      if (iss.fundPaise !== 0) violations.push(`issue ${iss._id}: REJECTED fund ≠ 0`);
      const fees = await WalletTxn.find({ issueId: iss._id, type: { $in: ['REPORT_FEE', 'SUPPORT_FEE', 'POOL_CONTRIBUTION'] } }).lean();
      const refunds = await WalletTxn.find({ issueId: iss._id, type: 'REFUND' }).lean();
      const feeSum = fees.reduce((s, f) => s + Math.abs(f.amountPaise), 0);
      const refSum = refunds.reduce((s, r) => s + r.amountPaise, 0);
      if (feeSum !== refSum) violations.push(`issue ${iss._id}: fees ${feeSum} vs refunds ${refSum}`);
    } else if (iss.fundPaise !== sup.total + credit) {
      violations.push(`issue ${iss._id}: fund ${iss.fundPaise} ≠ supports ${sup.total} + credit ${credit}`);
    }
    if (iss.supporterCount !== sup.count) violations.push(`issue ${iss._id}: supporterCount ${iss.supporterCount} ≠ ${sup.count}`);
    const reached = iss.tiersReached ?? [];
    if (reached.some((t) => ![1, 2].includes(t))) violations.push(`issue ${iss._id}: invalid tiersReached`);
    if (iss.tier !== (reached.length ? Math.max(...reached) : 0)) violations.push(`issue ${iss._id}: tier ≠ max(tiersReached)`);
    for (const t of reached) {
      const audits = await AuditLog.countDocuments({ action: 'TIER_CLAIMED', issueId: iss._id, tier: t });
      if (audits !== 1) violations.push(`issue ${iss._id}: tier ${t} has ${audits} audit rows (want 1)`);
      if (t === 2) {
        const emails = await DispatchLog.countDocuments({ issueId: iss._id, tier: 2, channel: 'EMAIL' });
        if (emails !== 1) violations.push(`issue ${iss._id}: tier 2 has ${emails} EMAIL rows (want 1)`);
      }
    }
  }
  summary.issues = issues.length;

  // 3. helper rating + connectCount
  const helpers = await Helper.find().lean();
  const reviewAgg = await Review.aggregate([{ $group: { _id: '$helperId', avg: { $avg: '$rating' }, count: { $sum: 1 } } }]);
  const revMap = new Map(reviewAgg.map((r) => [String(r._id), r]));
  for (const h of helpers) {
    const r = revMap.get(String(h._id)) ?? { avg: 0, count: 0 };
    const avg = Math.round((r.avg ?? 0) * 100) / 100;
    if (Math.abs(h.ratingAvg - avg) > 0.011) violations.push(`helper ${h._id}: ratingAvg ${h.ratingAvg} ≠ ${avg}`);
    if (h.ratingCount !== r.count) violations.push(`helper ${h._id}: ratingCount ${h.ratingCount} ≠ ${r.count}`);
    const distinct = await Connection.distinct('seekerId', { helperId: h._id });
    if (h.connectCount !== distinct.length) violations.push(`helper ${h._id}: connectCount ${h.connectCount} ≠ ${distinct.length}`);
  }
  summary.helpers = helpers.length;

  // 4. no helper phone in social/notification payloads
  const phones = helpers.map((h) => h.phone).filter(Boolean);
  const posts = await SocialPost.find().lean();
  const notes = await Notification.find().lean();
  const blob = JSON.stringify([...posts.map((p) => ({ c: p.captionEn, h: p.captionHi })), ...notes.map((n) => n.payload)]);
  for (const phone of phones) {
    if (phone && blob.includes(phone)) violations.push(`helper phone ${phone} leaked into social/notification payload`);
  }

  // 5. booking commission invariant
  const bookings = await Booking.find().lean();
  for (const b of bookings) {
    if (b.amountPaise !== b.commissionPaise + b.providerPayoutPaise) {
      violations.push(`booking ${b._id}: amount ${b.amountPaise} ≠ commission ${b.commissionPaise} + payout ${b.providerPayoutPaise}`);
    }
  }
  summary.bookings = bookings.length;

  return { ok: violations.length === 0, violations, summary };
}

export async function runVerifyCli() {
  const { connectDB, disconnectDB } = await import('../config/db.js');
  await connectDB();
  const { ok, violations, summary } = await verifyData();
  console.log('verify:data summary:', JSON.stringify(summary));
  if (ok) console.log('PASS: all data-integrity invariants hold.');
  else {
    console.error(`FAIL: ${violations.length} violations:\n` + violations.slice(0, 50).join('\n'));
  }
  await disconnectDB();
  process.exit(ok ? 0 : 1);
}

if (process.argv[1] && process.argv[1].endsWith('verify-data.js')) {
  runVerifyCli();
}
