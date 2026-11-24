import * as authorityService from './authority.service.js';
import { sendSuccess } from '../../utils/apiResponse.js';

export async function list(_req, res, next) {
  try {
    return sendSuccess(res, { authorities: await authorityService.listAuthorities() });
  } catch (error) {
    return next(error);
  }
}

export async function create(req, res, next) {
  try {
    return sendSuccess(res, { authority: await authorityService.createAuthority(req.body) }, 201);
  } catch (error) {
    return next(error);
  }
}

export async function update(req, res, next) {
  try {
    return sendSuccess(res, { authority: await authorityService.updateAuthority(req.params.id, req.body) });
  } catch (error) {
    return next(error);
  }
}
