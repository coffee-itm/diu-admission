import { defineConfig } from 'vitest/config'

// Backend tests only: `server/test/**`. The root vite.config.js keeps running `src/**` alone.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/**/*.test.js'],
    restoreMocks: true,
    // The first run downloads the mongod binary (~100 MB); later runs reuse the cache.
    hookTimeout: 120_000,
    testTimeout: 30_000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/**/*.js'],
      exclude: ['src/server.js'],
    },
  },
})
