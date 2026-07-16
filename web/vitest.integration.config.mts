import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

// DB-backed integration tests. Run via `npm run test:integration`, which loads
// .env.test (pointing DATABASE_URL at the throwaway test database) and applies
// migrations first. Kept separate from the jsdom unit suite so unit tests need
// no database.
export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: 'node',
    include: ['src/**/*.integration.test.{ts,tsx}'],
    fileParallelism: false,
    hookTimeout: 30_000,
    testTimeout: 30_000,
  },
});
