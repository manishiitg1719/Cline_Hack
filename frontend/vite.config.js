import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'node:fs'
import path from 'node:path'

/** Generates dist/sw.js from src/sw-template.js with the list of built files to pre-cache (app shell).
 *  Large model/wasm files are excluded here — the disease scanner caches them on first use. */
function serviceWorker() {
  return {
    name: 'farmguard-sw',
    apply: 'build',
    generateBundle(_, bundle) {
      const files = Object.keys(bundle)
        .filter((f) => !f.endsWith('.map') && !f.endsWith('.wasm') && !f.startsWith('selftest'))
        .map((f) => `/${f}`)
      const precache = ['/', '/index.html', '/manifest.webmanifest', '/icons/icon.svg', '/icons/icon-192.png', '/icons/icon-512.png', '/img/field-sun.webp', '/img/field-sun-sm.webp', ...files]
      const template = fs.readFileSync(path.resolve(__dirname, 'src/sw-template.js'), 'utf8')
      const source = template
        .replace('__VERSION__', Date.now().toString(36))
        .replace('__PRECACHE__', JSON.stringify([...new Set(precache)], null, 1))
      this.emitFile({ type: 'asset', fileName: 'sw.js', source })
    },
  }
}

export default defineConfig({
  plugins: [react(), serviceWorker()],
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
    strictPort: true, // fail loudly if 5173 is busy (an old dev server is still running) instead of moving to 5174
    fs: { allow: ['..'] },
    proxy: {
      '/api': 'http://127.0.0.1:8000',
    },
  },
  test: {
    environment: 'node',
  },
})
