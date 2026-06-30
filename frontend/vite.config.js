import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [vue()],
  assetsInclude: ['**/*.wasm'],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true
      }
    }
  },
  build: {
    assetsDir: 'assets',
    copyPublicDir: true
  },
  optimizeDeps: {
    exclude: ['cascade-core']
  }
})
