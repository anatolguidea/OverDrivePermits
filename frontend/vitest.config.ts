import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: [
      'src/lib/**/*.test.ts',
      'src/components/admin/**/*.test.ts',
    ],
    exclude: ['tests/e2e/**', 'node_modules/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json-summary'],
      include: [
        'src/lib/auth/roles.ts',
        'src/lib/auth/two-factor.shared.ts',
        'src/lib/auth/two-factor.ts',
        'src/lib/security/csp.ts',
        'src/lib/repositories/permits.repo.ts',
        'src/lib/validators/customer.schema.ts',
        'src/lib/validators/admin-api.schema.ts',
        'src/lib/observability/logger.ts',
      ],
      exclude: ['**/*.test.ts', '**/*.d.ts'],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },
  },
})
