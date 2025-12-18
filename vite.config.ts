import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Use VITE_BASE_PATH env var for base path
// Vercel: base = '/' (root)
// GitHub Pages: base = '/lacsworld5/' (repository name)
// Local dev: base = '/' (root)
const base = process.env.VITE_BASE_PATH ||
  (process.env.VERCEL ? '/' : process.env.NODE_ENV === 'development' ? '/' : '/LACSworld6/')

export default defineConfig({
  plugins: [react()],
  base,
  server: {
    host: '0.0.0.0',
    port: 5000,
    strictPort: true,
  },
  preview: {
    host: '127.0.0.1',
    port: 4173,
    strictPort: true,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'three-vendor': ['three', '@react-three/fiber', '@react-three/drei'],
          'animation-vendor': ['framer-motion'],
          'utils-vendor': ['clsx', 'tailwind-merge', 'mitt', 'zustand']
        }
      }
    },
    chunkSizeWarningLimit: 1000,
    target: 'esnext',
  },
  esbuild: {
    supported: {
      'top-level-await': true
    },
  },
  optimizeDeps: {
    esbuildOptions: {
      target: 'esnext',
    },
  },
})