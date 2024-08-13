// vitest.config.ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    clearMocks: true,
    coverage: {
      reporter: ['json-summary', 'text', 'lcov']
    }
  }
})
