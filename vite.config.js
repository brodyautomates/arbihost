import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// ARBIHOST — Vite config with Rentcast API proxy
// The proxy injects your RENTCAST_API_KEY server-side so it never appears in the browser bundle.
// All API calls in the app use /api/rentcast/... which gets proxied here.

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react()],
    server: {
      proxy: {
        '/api/rentcast': {
          target: 'https://api.rentcast.io',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/rentcast/, ''),
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq) => {
              proxyReq.setHeader('X-Api-Key', env.RENTCAST_API_KEY || '')
              proxyReq.setHeader('Accept', 'application/json')
            })
          },
        },
      },
    },
  }
})
