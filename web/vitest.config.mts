import { defineConfig, configDefaults } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    // Integration tests need a live DB and run under vitest.integration.config.mts.
    exclude: [...configDefaults.exclude, '**/*.integration.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json-summary'],
      // Enforced quality gate (see plan §Engineering Workflow). Unit-tested logic
      // lives in lib/server/components; framework wiring (client singleton, NextAuth
      // setup, route handlers) is exercised by integration/e2e and excluded here.
      include: [
        'src/lib/**/*.{ts,tsx}',
        'src/server/**/*.{ts,tsx}',
        'src/components/**/*.{ts,tsx}',
      ],
      exclude: [
        '**/*.{test,spec}.*',
        '**/*.integration.test.*',
        '**/*.d.ts',
        '**/types.ts',
        'src/generated/**',
        'src/server/db.ts',
        'src/server/auth.ts',
        'src/server/tenant.ts',
        'src/server/stripe.ts',
        'src/server/checkout.ts',
        'src/server/storage.ts',
        'src/server/delivery.ts',
        'src/server/actions/**',
        'src/server/services/**',
      ],
      thresholds: { lines: 90, functions: 90, branches: 90, statements: 90 },
    },
  },
});
