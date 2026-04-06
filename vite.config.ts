import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/lib/**', 'src/stores/**'],
    },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
      },
      manifest: {
        name: '100PLUS SHOP',
        short_name: '100PLUS',
        description: 'Gestion commerciale 100PLUS SHOP',
        theme_color: '#FF0066',
        background_color: '#f9fafb',
        display: 'standalone',
        icons: [
          { src: '/logo_192.png', sizes: '192x192', type: 'image/png' },
          { src: '/logo_512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
    }),
  ],
})
