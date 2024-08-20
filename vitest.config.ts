// vitest.config.ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    clearMocks: true,
    testTimeout: 15000,
    coverage: {
      reporter: ['json-summary', 'text', 'lcov']
    }
  }
})
