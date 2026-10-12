import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/',
  server: {
    port: 5173,
    // The local Claude proxy (node server.js) stands in for functions/api/agent.ts
    proxy: {
      '/api/agent': 'http://127.0.0.1:3001',
    },
  },
  build: {
    target: 'esnext',
    sourcemap: true,
  },
})
