import * as adminService from './admin.service.js';
import { getDashboard } from './admin.dashboard.js';
import { sendSuccess } from '../../utils/apiResponse.js';

const wrap = (fn) => async (req, res, next) => {
  try { return sendSuccess(res, await fn(req)); } catch (error) { return next(error); }
};

export const listIssues = wrap((req) => adminService.listAdminIssues(req.validated.query));
export const getIssue = wrap((req) => adminService.getAdminIssue(req.params.issueId));
export const transition = wrap((req) => adminService.adminTransition(req.params.issueId, req.body.status, req.body.note, req.user));
export const assignAuthority = wrap((req) => adminService.assignAuthority(req.params.issueId, req.body.authorityId, req.user));
export const authorityReply = wrap((req) => adminService.authorityReply(req.params.issueId, req.body.message, req.body.authorityId, req.user));
export const credit = wrap((req) => adminService.platformCredit(req.params.issueId, req.body.amountPaise, req.body.reason, req.body.idempotencyKey, req.user));
export const dismissFlags = wrap((req) => adminService.dismissIssueFlags(req.params.issueId, req.user));

export const listUsers = wrap((req) => adminService.listAdminUsers(req.validated.query));
export const getUser = wrap((req) => adminService.getAdminUser(req.params.userId));
export const patchUser = wrap((req) => adminService.patchUserActive(req.params.userId, req.body.isActive, req.user));

export const getSettings = wrap(() => adminService.getAdminSettings());
export const patchSettings = wrap((req) => adminService.patchAdminSettings(req.body, req.user));
export const getCategories = wrap(() => adminService.getCategories());
export const patchCategories = wrap((req) => adminService.patchCategories(req.body, req.user));

export const dashboard = wrap((req) => getDashboard(req.validated.query.days));
export const listAudit = wrap((req) => adminService.listAudit(req.validated.query));
export const auditActions = wrap(() => adminService.auditActions());
