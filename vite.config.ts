import { defineConfig } from 'vitest/config'
import type { Plugin } from 'vite'
import { pagePaths, renderRouteHead } from './src/lib/route-metadata'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Use Vite's finished HTML so every route gets the same hashed assets and CSP.
function staticRouteMetadata(): Plugin {
  return {
    name: 'static-route-metadata',
    apply: (_config, env) => env.command === 'build' && env.mode === 'production',
    generateBundle: {
      order: 'post',
      handler(_options, bundle) {
        const entry = bundle['index.html']
        if (!entry || entry.type !== 'asset' || typeof entry.source !== 'string') {
          this.error('Expected Vite to emit index.html before generating route metadata')
        }
        const html = entry.source
        for (const path of pagePaths) {
          if (path !== '/') this.emitFile({ type: 'asset', fileName: 'route-pages' + path + '.html', source: renderRouteHead(html, path) })
        }
        this.emitFile({ type: 'asset', fileName: 'route-pages/fallback.html', source: renderRouteHead(html, '') })
      },
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), staticRouteMetadata()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-charts': ['recharts'],
        },
      },
    },
  },
  test: { environment: 'jsdom', globals: true, include: ['tests/**/*.test.{ts,tsx}'], setupFiles: ['tests/setup.ts'] },
})
