import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react()],
    define: { 'import.meta.env.VITE_API_URL': JSON.stringify(env.VITE_API_URL || '/api') },
    server: {
      proxy: {
        '/api': { target: env.VITE_API_PROXY_TARGET || 'http://localhost:8787', changeOrigin: true },
        '/socket.io': { target: env.VITE_API_PROXY_TARGET || 'http://localhost:8787', changeOrigin: true, ws: true },
      },
    },
  }
})
