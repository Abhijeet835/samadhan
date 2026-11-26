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

export async function map(req, res, next) {
  try {
    return sendSuccess(res, await issueService.getIssuesMap(req.validated.query));
  } catch (error) {
    return next(error);
  }
}

export async function flag(req, res, next) {
  try {
    return sendSuccess(res, await issueService.flagIssue({ userId: req.user.userId, issueId: req.params.issueId, reason: req.body.reason, comment: req.body.comment }));
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

/**
 * POST /api/issues/:issueId/support — protected paid +1
 */
export async function support(req, res, next) {
  try {
    const result = await issueService.supportIssue({
      issueId: req.params.issueId,
      userId: req.user.userId,
      idempotencyKey: req.body.idempotencyKey,
      amountPaise: req.body.amountPaise,
    });
    return sendSuccess(res, result, result.idempotent ? 200 : 201);
  } catch (error) {
    return next(error);
  }
}

export async function locationStats(req, res, next) {
  try {
    return sendSuccess(res, await issueService.getLocationStats({ state: req.query.state, lang: req.query.lang }));
  } catch (error) {
    return next(error);
  }
}

export async function partners(req, res, next) {
  try {
    return sendSuccess(res, await issueService.getPartnerRecognitions({ lang: req.query.lang }));
  } catch (error) {
    return next(error);
  }
}

export async function resolveIssue(req, res, next) {
  try {
    const issue = await issueService.recordResolution({
      issueId: req.params.issueId,
      actor: { userId: req.user.userId, role: req.user.role },
      data: req.body,
    });
    return sendSuccess(res, { issue });
  } catch (error) {
    return next(error);
  }
}

export async function addUtilization(req, res, next) {
  try {
    const issue = await issueService.addFundUtilization({
      issueId: req.params.issueId,
      actor: { userId: req.user.userId, role: req.user.role },
      data: req.body,
    });
    return sendSuccess(res, { issue });
  } catch (error) {
    return next(error);
  }
}

/**
 * GET /api/issues/:issueId/supporters — public, privacy-safe supporter list
 */
export async function supporters(req, res, next) {
  try {
    return sendSuccess(
      res,
      await issueService.listSupporters(req.params.issueId, req.user, req.validated.query),
    );
  } catch (error) {
    return next(error);
  }
}

/**
 * GET /api/issues/mine — protected, issues I reported
 */
export async function mine(req, res, next) {
  try {
    return sendSuccess(res, await issueService.listMyIssues(req.user.userId, req.validated.query));
  } catch (error) {
    return next(error);
  }
}

/**
 * GET /api/issues/mine/supported — protected, issues I supported
 */
export async function mineSupported(req, res, next) {
  try {
    return sendSuccess(
      res,
      await issueService.listMySupported(req.user.userId, req.validated.query),
    );
  } catch (error) {
    return next(error);
  }
}