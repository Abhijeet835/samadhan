import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  _resetSwUpdateStateForTests,
  applySwUpdate,
  isSwUpdateAvailable,
  markSwUpdateAvailable,
  setSwUpdater,
} from './swUpdate';

describe('swUpdate', () => {
  beforeEach(() => {
    _resetSwUpdateStateForTests();
  });

  it('tracks update availability across state calls', () => {
    expect(isSwUpdateAvailable()).toBe(false);
    markSwUpdateAvailable();
    expect(isSwUpdateAvailable()).toBe(true);
  });

  it('sends SKIP_WAITING to waiting worker and reloads once on controllerchange', async () => {
    markSwUpdateAvailable();
    const updateRunner = vi.fn(async () => {});
    setSwUpdater(updateRunner);

    const postMessage = vi.fn();
    const listeners = {};
    const swContainer = {
      addEventListener: vi.fn((event, cb) => {
        listeners[event] = cb;
      }),
      getRegistration: vi.fn(async () => ({
        waiting: { postMessage },
      })),
    };
    const reload = vi.fn();
    const win = { location: { reload }, setTimeout: vi.fn() };

    await applySwUpdate({ nav: { serviceWorker: swContainer }, win });

    expect(isSwUpdateAvailable()).toBe(false);
    expect(updateRunner).toHaveBeenCalledWith(true);
    expect(postMessage).toHaveBeenCalledWith({ type: 'SKIP_WAITING' });
    expect(reload).not.toHaveBeenCalled();

    listeners.controllerchange();
    listeners.controllerchange();
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('reloads directly when no service worker is waiting', async () => {
    markSwUpdateAvailable();
    const swContainer = {
      addEventListener: vi.fn(),
      getRegistration: vi.fn(async () => ({ waiting: null })),
    };
    const reload = vi.fn();
    const win = { location: { reload }, setTimeout: vi.fn() };

    await applySwUpdate({ nav: { serviceWorker: swContainer }, win });

    expect(isSwUpdateAvailable()).toBe(false);
    expect(reload).toHaveBeenCalledTimes(1);
  });
});
