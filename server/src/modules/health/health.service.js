import { getDbState } from '../../config/db.js';

export function getHealthStatus() {
  return {
    status: 'ok',
    db: getDbState(),
    timestamp: new Date().toISOString(),
  };
}
