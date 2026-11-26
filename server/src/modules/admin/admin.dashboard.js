import Issue from '../issues/issue.model.js';
import IssueFlag from './issueFlag.model.js';
import WalletTxn from '../wallet/walletTxn.model.js';
import Wallet from '../wallet/wallet.model.js';
import User from '../users/user.model.js';
import Helper from '../helpers/helper.model.js';
import Connection from '../helpers/connection.model.js';
import Review from '../helpers/review.model.js';
import DispatchLog from '../dispatch/dispatchLog.model.js';
import SocialPost from '../social/socialPost.model.js';
import Booking from '../bookings/booking.model.js';
import { getPlatformCommissionSummary } from '../bookings/booking.service.js';

const OPEN = ['ACTIVE', 'ACKNOWLEDGED', 'IN_PROGRESS'];
const countMap = (a) => Object.fromEntries(a.map((x) => [x._id, x.n]));

export async function getDashboard(days = 30) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const dayKey = (d) => new Date(d).toISOString().slice(0, 10);
  const buckets = [];
  for (let i = days - 1; i >= 0; i -= 1) buckets.push(dayKey(Date.now() - i * 24 * 60 * 60 * 1000));
  const zero = () => Object.fromEntries(buckets.map((b) => [b, 0]));

  const [usersByRole, newUsers, helpersAgg, hiddenHelpers, issuesByStatus, issuesByTier, issuesByCategory, newIssues, openFund, feeAgg, walletAgg, connRange, revRange, pendingHelpers, failedDispatch, failedSocial, flaggedIds, tier1Active, issuesPerDayAgg, feesPerDayAgg, connPerDayAgg, bookingsCount, bookingCommission] = await Promise.all([
    User.aggregate([{ $group: { _id: '$role', n: { $sum: 1 } } }]),
    User.countDocuments({ createdAt: { $gte: since } }),
    Helper.aggregate([{ $group: { _id: '$verificationStatus', n: { $sum: 1 } } }]),
    Helper.countDocuments({ isHidden: true }),
    Issue.aggregate([{ $group: { _id: '$status', n: { $sum: 1 } } }]),
    Issue.aggregate([{ $group: { _id: '$tier', n: { $sum: 1 } } }]),
    Issue.aggregate([{ $group: { _id: '$category', n: { $sum: 1 } } }]),
    Issue.countDocuments({ createdAt: { $gte: since } }),
    Issue.aggregate([{ $match: { status: { $in: OPEN } } }, { $group: { _id: null, fund: { $sum: '$fundPaise' }, credit: { $sum: '$platformCreditPaise' } } }]),
    WalletTxn.aggregate([{ $group: { _id: '$type', total: { $sum: '$amountPaise' } } }]),
    Wallet.aggregate([{ $group: { _id: null, total: { $sum: '$balancePaise' } } }]),
    Connection.countDocuments({ createdAt: { $gte: since } }),
    Review.countDocuments({ createdAt: { $gte: since } }),
    Helper.countDocuments({ verificationStatus: 'PENDING' }),
    DispatchLog.countDocuments({ status: 'FAILED' }),
    SocialPost.countDocuments({ status: 'FAILED' }),
    IssueFlag.distinct('issueId', { dismissed: false }),
    Issue.countDocuments({ status: 'ACTIVE', $or: [{ explosionTriggered: true }, { tier: { $gte: 1 } }] }),
    Issue.aggregate([{ $match: { createdAt: { $gte: since } } }, { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, n: { $sum: 1 } } }]),
    WalletTxn.aggregate([{ $match: { createdAt: { $gte: since }, type: { $in: ['REPORT_FEE', 'SUPPORT_FEE', 'POOL_CONTRIBUTION', 'REFUND'] } } }, { $group: { _id: { day: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, type: '$type' }, total: { $sum: '$amountPaise' } } }]),
    Connection.aggregate([{ $match: { createdAt: { $gte: since } } }, { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, n: { $sum: 1 } } }]),
    Booking.countDocuments(),
    getPlatformCommissionSummary(),
  ]);

  const feeMap = Object.fromEntries(feeAgg.map((f) => [f._id, f.total]));
  const gross = -((feeMap.REPORT_FEE ?? 0) + (feeMap.SUPPORT_FEE ?? 0) + (feeMap.POOL_CONTRIBUTION ?? 0));
  const refunds = feeMap.REFUND ?? 0;
  const statusMap = countMap(issuesByStatus);
  const helperMap = countMap(helpersAgg);

  const issuesPerDay = zero(); issuesPerDayAgg.forEach((x) => { if (x._id in issuesPerDay) issuesPerDay[x._id] = x.n; });
  const connectionsPerDay = zero(); connPerDayAgg.forEach((x) => { if (x._id in connectionsPerDay) connectionsPerDay[x._id] = x.n; });
  const feesPerDay = Object.fromEntries(buckets.map((b) => [b, { grossFeesPaise: 0, refundsPaise: 0 }]));
  feesPerDayAgg.forEach((x) => {
    const day = x._id.day;
    if (!feesPerDay[day]) return;
    if (x._id.type === 'REFUND') feesPerDay[day].refundsPaise += x.total;
    else feesPerDay[day].grossFeesPaise += -x.total;
  });

  return {
    days,
    users: { total: usersByRole.reduce((s, x) => s + x.n, 0), byRole: countMap(usersByRole), newInRange: newUsers },
    helpers: { total: helpersAgg.reduce((s, x) => s + x.n, 0), verified: helperMap.VERIFIED ?? 0, pending: helperMap.PENDING ?? 0, rejected: helperMap.REJECTED ?? 0, hidden: hiddenHelpers },
    issues: { total: issuesByStatus.reduce((s, x) => s + x.n, 0), byStatus: statusMap, byTier: countMap(issuesByTier), byCategory: countMap(issuesByCategory), newInRange: newIssues, open: OPEN.reduce((s, st) => s + (statusMap[st] ?? 0), 0) },
    funds: { openFundPaise: openFund[0]?.fund ?? 0, platformCreditPaise: openFund[0]?.credit ?? 0 },
    simulatedRevenue: { grossFeesPaise: gross, refundsPaise: refunds, netPaise: gross - refunds, topupsPaise: feeMap.TOPUP ?? 0, signupCreditsPaise: feeMap.SIGNUP_CREDIT ?? 0 },
    wallet: { totalBalancePaise: walletAgg[0]?.total ?? 0 },
    local: { connectionsInRange: connRange, reviewsInRange: revRange, totalBookings: bookingsCount, ...bookingCommission },
    attention: { pendingHelperVerifications: pendingHelpers, hiddenHelpers, failedDispatch, failedSocial, flaggedIssues: flaggedIds.length, tier1PlusStillActive: tier1Active },
    series: { issuesPerDay, feesPerDay, connectionsPerDay },
  };
}
