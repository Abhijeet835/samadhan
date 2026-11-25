import * as helperService from './helper.service.js';
import { sendSuccess } from '../../utils/apiResponse.js';

export async function meta(_req, res, next) {
  try {
    return sendSuccess(res, helperService.getHelperMeta());
  } catch (error) {
    return next(error);
  }
}

export async function search(req, res, next) {
  try {
    return sendSuccess(res, await helperService.searchHelpers(req.validated.query));
  } catch (error) {
    return next(error);
  }
}

export async function register(req, res, next) {
  try {
    const helper = await helperService.registerHelper(req.user.userId, req.body);
    return sendSuccess(res, { helper }, 201);
  } catch (error) {
    return next(error);
  }
}

export async function dashboard(req, res, next) {
  try {
    return sendSuccess(res, await helperService.getHelperDashboard(req.user.userId, req.validated.query));
  } catch (error) {
    return next(error);
  }
}

export async function updateMe(req, res, next) {
  try {
    const helper = await helperService.updateMyHelper(req.user.userId, req.body);
    return sendSuccess(res, { helper });
  } catch (error) {
    return next(error);
  }
}

export async function mineConnected(req, res, next) {
  try {
    return sendSuccess(res, await helperService.getMyConnectedHelpers(req.user.userId, req.validated.query));
  } catch (error) {
    return next(error);
  }
}

export async function detail(req, res, next) {
  try {
    return sendSuccess(res, await helperService.getHelperById(req.params.helperId, req.user?.userId, req.validated.query));
  } catch (error) {
    return next(error);
  }
}

export async function connect(req, res, next) {
  try {
    const result = await helperService.connectHelper({ seekerId: req.user.userId, helperId: req.params.helperId });
    return sendSuccess(res, result);
  } catch (error) {
    return next(error);
  }
}

export async function review(req, res, next) {
  try {
    const result = await helperService.upsertReview({
      seekerId: req.user.userId,
      helperId: req.params.helperId,
      rating: req.body.rating,
      comment: req.body.comment,
    });
    return sendSuccess(res, result, result.updated ? 200 : 201);
  } catch (error) {
    return next(error);
  }
}

export async function flag(req, res, next) {
  try {
    return sendSuccess(res, await helperService.flagHelper({ userId: req.user.userId, helperId: req.params.helperId, reason: req.body.reason }));
  } catch (error) {
    return next(error);
  }
}

export async function adminList(req, res, next) {
  try {
    return sendSuccess(res, await helperService.adminListHelpers(req.validated.query));
  } catch (error) {
    return next(error);
  }
}

export async function adminPatch(req, res, next) {
  try {
    const helper = await helperService.adminPatchHelper(req.params.helperId, req.body, req.user);
    return sendSuccess(res, { helper });
  } catch (error) {
    return next(error);
  }
}
