import { defineConfig, configDefaults } from 'vitest/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const runIntegration = process.env.RUN_INTEGRATION_TESTS === 'true';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './client/src'),
      '@shared': path.resolve(__dirname, './shared'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['**/*.test.ts', '**/*.spec.ts'],
    exclude: runIntegration
      ? [...configDefaults.exclude]
      : [...configDefaults.exclude, '**/*.integration.test.ts', '**/*.integration-test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
    env: {
      GEMINI_API_KEY: 'test-api-key',
      OPENAI_API_KEY: 'test-api-key',
      DATABASE_URL: process.env.DATABASE_URL || 'postgresql://linguamaster:linguamaster@localhost:5432/linguamaster',
    },
    testTimeout: 10000, // 10 seconds for integration tests
  },
});
