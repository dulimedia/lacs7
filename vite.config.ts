import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Use VITE_BASE_PATH env var for base path
// Vercel: base = '/' (root)
// GitHub Pages: base = '/lacsworld5/' (repository name)
// Local dev: base = '/' (root)
const base = process.env.VITE_BASE_PATH || 
             (process.env.VERCEL ? '/' : process.env.NODE_ENV === 'development' ? '/' : '/lacsworld5/')

export default defineConfig({
  plugins: [react()],
  base,
  server: {
    host: '0.0.0.0',
    port: 4500,
    strictPort: true,
  },
  preview: {
    host: '127.0.0.1',
    port: 4173,
    strictPort: true,
  },
  build: {
    target: 'esnext',
    cssTarget: 'safari14',
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: 1000, // Smaller chunks for mobile
    assetsInlineLimit: 0,
    rollupOptions: {
      // Disable tree-shaking for now to prevent empty chunks
      treeshake: false,
      output: {
        // Simplified chunk strategy
        manualChunks: undefined,
      },
    },
    copyPublicDir: true,
  },
  publicDir: 'public',
  optimizeDeps: {
    esbuildOptions: {
      target: 'esnext',
    },
  },
})