import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'db/setup.js',
        'db/pool.js',   // pure config, no logic
        'index.js',     // entry point, just wires up server
        'vitest.config.js',
      ],
    },
  },
});
