import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, '../shared'),
    },
  },
  build: {
    rollupOptions: {
      // selftest.html = dev/QA page that runs the offline model on the example photos
      input: { main: path.resolve(__dirname, 'index.html'), selftest: path.resolve(__dirname, 'selftest.html') },
    },
  },
  preview: {
    port: 4173,
    proxy: { '/api': 'http://127.0.0.1:8000' },
  },
  server: {
    port: 5173,
    fs: { allow: ['..'] },
    proxy: {
      '/api': 'http://127.0.0.1:8000',
    },
  },
  test: {
    environment: 'node',
  },
})
