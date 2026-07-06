import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['logo.png', 'apple-touch-icon.png', 'login-mark.png', 'favicon.svg'],
      manifest: {
        name: 'Familie Eten',
        short_name: 'FamEten',
        description: 'Weekmaaltijdplanner voor het hele gezin',
        theme_color: '#2a9d8f',
        background_color: '#f0f4f8',
        display: 'standalone',
        orientation: 'portrait-primary',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: 'login-mark.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'login-mark.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // Cache the app shell and all static assets
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        globIgnores: [],
        runtimeCaching: [
          {
            // Cache all navigation requests so the app loads offline
            urlPattern: ({ request }) => request.mode === 'navigate',
            handler: 'NetworkFirst',
            options: {
              cacheName: 'pages',
              networkTimeoutSeconds: 3,
            },
          },
        ],
      },
    }),
  ],
})
