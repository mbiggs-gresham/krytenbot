// vitest.config.ts
import { defineConfig, coverageConfigDefaults } from 'vitest/config'

export default defineConfig({
  test: {
    clearMocks: true,
    testTimeout: 15000,
    coverage: {
      reporter: ['json-summary', 'text', 'lcov'],
      exclude: [...coverageConfigDefaults.exclude, 'src/git-helper.ts']
    }
  }
})
