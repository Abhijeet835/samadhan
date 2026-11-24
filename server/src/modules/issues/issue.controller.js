import * as issueService from './issue.service.js';
import { sendSuccess } from '../../utils/apiResponse.js';

/**
 * GET /api/issues/meta — public wizard metadata
 */
export async function getMeta(_req, res, next) {
  try {
    return sendSuccess(res, await issueService.getIssueMeta());
  } catch (error) {
    return next(error);
  }
}

/**
 * GET /api/issues — public feed
 */
export async function list(req, res, next) {
  try {
    return sendSuccess(res, await issueService.listIssues(req.validated.query));
  } catch (error) {
    return next(error);
  }
}

/**
 * GET /api/issues/:issueId — public detail (optional auth for viewer context)
 */
export async function detail(req, res, next) {
  try {
    return sendSuccess(res, await issueService.getIssueDetail(req.params.issueId, req.user));
  } catch (error) {
    return next(error);
  }
}

/**
 * POST /api/issues — protected report creation
 */
export async function create(req, res, next) {
  try {
    const { issue, idempotent } = await issueService.createIssue({
      reporterId: req.user.userId,
      data: req.body,
    });
    return sendSuccess(res, { issue }, idempotent ? 200 : 201);
  } catch (error) {
    return next(error);
  }
}

/**
 * POST /api/issues/:issueId/transition — protected lifecycle change
 */
export async function transition(req, res, next) {
  try {
    const { status, note } = req.body;
    const issue = await issueService.transitionIssue(
      req.params.issueId,
      status,
      { userId: req.user.userId, role: req.user.role },
      note,
    );
    return sendSuccess(res, { issue });
  } catch (error) {
    return next(error);
  }
}