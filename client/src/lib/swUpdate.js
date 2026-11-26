let updateAvailable = false;
let updateRunner = null;
let reloaded = false;

/** Returns whether a waiting service worker update prompt was signaled. */
export function isSwUpdateAvailable() {
  return updateAvailable;
}

/** Stores the `updateSW` callback returned by `registerSW`. */
export function setSwUpdater(fn) {
  updateRunner = typeof fn === 'function' ? fn : null;
}

/** Marks an update available and notifies mounted UI banners. */
export function markSwUpdateAvailable() {
  updateAvailable = true;
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('samadhan:sw-update'));
  }
}

/** Clears the pending update flag and notifies mounted UI banners. */
export function clearSwUpdateAvailable() {
  updateAvailable = false;
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('samadhan:sw-update-cleared'));
  }
}

/**
 * Promotes any waiting service worker via SKIP_WAITING before reloading,
 * so refreshing actually clears the "Update available" prompt instead of
 * reloading under the old worker.
 */
export async function applySwUpdate({
  nav = typeof navigator !== 'undefined' ? navigator : undefined,
  win = typeof window !== 'undefined' ? window : undefined,
} = {}) {
  clearSwUpdateAvailable();

  const triggerReload = () => {
    if (reloaded) return;
    reloaded = true;
    win?.location?.reload?.();
  };

  const swContainer = nav?.serviceWorker;
  if (swContainer?.addEventListener) {
    swContainer.addEventListener('controllerchange', triggerReload, { once: true });
  }

  if (typeof updateRunner === 'function') {
    await updateRunner(true);
  }

  let hasWaiting = false;
  if (swContainer?.getRegistration) {
    const reg = await swContainer.getRegistration().catch(() => null);
    if (reg?.waiting) {
      hasWaiting = true;
      reg.waiting.postMessage({ type: 'SKIP_WAITING' });
    }
  }

  if (hasWaiting && swContainer?.addEventListener) {
    win?.setTimeout?.(triggerReload, 800);
  } else {
    triggerReload();
  }
}

export function _resetSwUpdateStateForTests() {
  updateAvailable = false;
  updateRunner = null;
  reloaded = false;
}
