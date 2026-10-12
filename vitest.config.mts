import { defineConfig } from 'vitest/config'

// Tests run in plain Node: none of them needs a DOM or React.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
