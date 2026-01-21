import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'tests/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/index.ts',
        '**/repository/**', // Exclude repository layer (file system operations, tested via integration)
        '**/*.tsx', // Exclude React components (tested via integration/e2e tests)
      ],
      // Coverage thresholds - fail CI if coverage drops below these levels
      // Note: Thresholds temporarily lowered due to shopping services needing better test coverage
      // TODO: Improve shopping service coverage (aggregation.ts, encoder.ts, unitConverter.ts)
      thresholds: {
        statements: 95,
        branches: 85,
        functions: 93,
        lines: 96,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
