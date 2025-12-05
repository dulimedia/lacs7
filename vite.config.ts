import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Use VITE_BASE_PATH env var for base path
// Vercel: base = '/' (root)
// GitHub Pages: base = '/LACSWORLD4/' (repository name)
// Local dev: base = '/' (root)
const base = process.env.VITE_BASE_PATH || 
             (process.env.VERCEL ? '/' : process.env.NODE_ENV === 'development' ? '/' : '/LACSWORLD4/')

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
      treeshake: {
        moduleSideEffects: false,
        // Remove unused exports for better tree-shaking
        preset: 'safest',
      },
      output: {
        manualChunks: {
          // Split Three.js and related libs into separate chunk
          'three-vendor': ['three', '@react-three/fiber', '@react-three/drei'],
          // Split UI libraries
          'ui-vendor': ['react', 'react-dom', 'lucide-react', 'framer-motion'],
          // Split heavy optional features (these will only load if actually used)
          'postprocessing': ['@react-three/postprocessing', 'postprocessing'],
          'pathtracer': ['three-gpu-pathtracer'],
        },
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