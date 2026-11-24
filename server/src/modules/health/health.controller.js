import { sendSuccess } from '../../utils/apiResponse.js';
import { getHealthStatus } from './health.service.js';

export function healthCheck(_req, res) {
  return sendSuccess(res, getHealthStatus());
}
