import * as walletService from './wallet.service.js';
import { sendSuccess } from '../../utils/apiResponse.js';

/**
 * GET /api/wallet
 */
export async function getWallet(req, res, next) {
  try {
    const data = await walletService.getWallet(req.user.userId);
    return sendSuccess(res, data);
  } catch (error) {
    return next(error);
  }
}

/**
 * POST /api/wallet/topup
 */
export async function topup(req, res, next) {
  try {
    const data = await walletService.topupWallet(req.user.userId, req.body);
    return sendSuccess(res, data, data.idempotent ? 200 : 201);
  } catch (error) {
    return next(error);
  }
}

/**
 * GET /api/wallet/txns
 */
export async function listTxns(req, res, next) {
  try {
    const { page, limit } = req.validated.query;
    const data = await walletService.listTxns(req.user.userId, { page, limit });
    return sendSuccess(res, data);
  } catch (error) {
    return next(error);
  }
}