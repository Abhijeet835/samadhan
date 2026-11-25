// Offline report draft. NEVER stores photos, idempotency keys, payment state
// or tokens. Expires after 7 days; all access wrapped for quota/private mode.
const PREFIX = 'samadhan:reportDraft:';
const VERSION = 1;
const TTL_MS = 7 * 24 * 60 * 60 * 1000;

const keyFor = (userId) => `${PREFIX}${userId ?? 'anon'}`;

export function saveDraft(userId, draft) {
  try {
    const payload = {
      version: VERSION,
      savedAt: Date.now(),
      category: draft.category ?? '',
      title: draft.title ?? '',
      description: draft.description ?? '',
      urgency: draft.urgency ?? '',
      hideName: !!draft.hideName,
      location: draft.location ?? null,
      step: draft.step ?? 0,
    };
    localStorage.setItem(keyFor(userId), JSON.stringify(payload));
    return true;
  } catch {
    return false;
  }
}

export function loadDraft(userId) {
  try {
    const raw = localStorage.getItem(keyFor(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed?.version !== VERSION || !parsed.savedAt) return null;
    if (Date.now() - parsed.savedAt > TTL_MS) {
      clearDraft(userId);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function clearDraft(userId) {
  try {
    localStorage.removeItem(keyFor(userId));
  } catch {
    /* ignore */
  }
}
