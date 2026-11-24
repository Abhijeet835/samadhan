import * as dispatchService from './dispatch.service.js';
import { recheckTiers } from '../tiers/tier.service.js';
import { sendSuccess } from '../../utils/apiResponse.js';

export async function list(req, res, next) {
  try {
    return sendSuccess(res, await dispatchService.listDispatch(req.validated.query));
  } catch (error) {
    return next(error);
  }
}

export async function retry(req, res, next) {
  try {
    const row = await dispatchService.retryDispatch(req.params.logId);
    return sendSuccess(res, { row });
  } catch (error) {
    return next(error);
  }
}

export async function recheck(req, res, next) {
  try {
    const { claimedTiers, done } = await recheckTiers(req.params.issueId);
    await done;
    return sendSuccess(res, { claimedTiers });
  } catch (error) {
    return next(error);
  }
}
