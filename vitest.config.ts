import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['server/**/*.test.ts', 'lib/**/*.test.ts'],
    testTimeout: 10000,
    // Phase 3.5 Wave 0: empty test suite must pass so `npm test` is wired
    // before any tests exist. Wave 1 plans add real tests.
    passWithNoTests: true,
  },
});
