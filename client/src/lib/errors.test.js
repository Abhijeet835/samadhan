import { describe, expect, it } from 'vitest';
import { getErrorMessage } from '@/lib/errors';

const t = (key) => (key.startsWith('errors.') ? `T:${key}` : key);

describe('getErrorMessage', () => {
  it('maps a known code to its i18n key', () => {
    const err = { response: { data: { error: { code: 'INSUFFICIENT_BALANCE', message: 'raw english' } } } };
    expect(getErrorMessage(err, t)).toBe('T:errors.INSUFFICIENT_BALANCE');
  });
  it('unknown code falls back to UNKNOWN', () => {
    const err = { response: { data: { error: { code: 'NEVER_SEEN' } } } };
    const tt = (k) => (k === 'errors.NEVER_SEEN' ? k : `T:${k}`);
    expect(getErrorMessage(err, tt)).toBe('T:errors.UNKNOWN');
  });
  it('network failure → NETWORK_ERROR', () => {
    expect(getErrorMessage({ code: 'ERR_NETWORK', request: {} }, t)).toBe('T:errors.NETWORK_ERROR');
  });
  it('timeout → TIMEOUT', () => {
    expect(getErrorMessage({ code: 'ECONNABORTED', message: 'timeout of 30000ms' }, t)).toBe('T:errors.TIMEOUT');
  });
  it('null/unknown → UNKNOWN', () => {
    expect(getErrorMessage(null, t)).toBe('T:errors.UNKNOWN');
    expect(getErrorMessage({}, t)).toBe('T:errors.UNKNOWN');
  });
});
