import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    // The in-memory replica set needs time to download/boot on first run.
    testTimeout: 60_000,
    hookTimeout: 300_000,
    fileParallelism: false,
  },
});