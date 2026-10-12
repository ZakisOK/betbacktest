import { defineConfig } from 'vitest/config'

// Engine tests run in plain Node: src/engine has no DOM or React dependencies.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
