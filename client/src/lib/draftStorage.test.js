// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { saveDraft, loadDraft, clearDraft } from '@/lib/draftStorage';

function makeStorage() {
  const map = new Map();
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
    clear: () => map.clear(),
  };
}

beforeEach(() => {
  vi.stubGlobal('localStorage', makeStorage());
});

describe('draftStorage', () => {
  it('saves and loads a draft (no photos/keys/tokens)', () => {
    saveDraft('u1', { title: 'T', description: 'D', category: 'ROAD', step: 1, location: { coordinates: [77, 12] }, idempotencyKey: 'SECRET', photos: ['x'] });
    const d = loadDraft('u1');
    expect(d.title).toBe('T');
    expect(d.step).toBe(1);
    expect(d.version).toBe(1);
    expect(d.idempotencyKey).toBeUndefined();
    expect(d.photos).toBeUndefined();
  });
  it('expires after 7 days', () => {
    saveDraft('u1', { title: 'T' });
    const raw = JSON.parse(localStorage.getItem('samadhan:reportDraft:u1'));
    raw.savedAt = Date.now() - 8 * 24 * 60 * 60 * 1000;
    localStorage.setItem('samadhan:reportDraft:u1', JSON.stringify(raw));
    expect(loadDraft('u1')).toBeNull();
  });
  it('clear removes the draft', () => {
    saveDraft('u1', { title: 'T' });
    clearDraft('u1');
    expect(loadDraft('u1')).toBeNull();
  });
  it('corrupt JSON returns null safely', () => {
    localStorage.setItem('samadhan:reportDraft:u1', '{not json');
    expect(loadDraft('u1')).toBeNull();
  });
  it('quota error is swallowed', () => {
    vi.stubGlobal('localStorage', { getItem: () => null, setItem: () => { throw new Error('quota'); }, removeItem: () => {} });
    expect(saveDraft('u1', { title: 'T' })).toBe(false);
  });
});
