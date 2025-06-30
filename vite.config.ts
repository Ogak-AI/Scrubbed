import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      'react': 'react',
      'react-dom': 'react-dom'
    },
    dedupe: ['react', 'react-dom']
  },
  optimizeDeps: {
    include: ['react', 'react-dom', '@supabase/supabase-js', 'react-router-dom'],
    exclude: ['lucide-react'],
    force: true
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      external: [],
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'supabase-vendor': ['@supabase/supabase-js'],
          'router-vendor': ['react-router-dom'],
          'icons-vendor': ['lucide-react']
        }
      }
    },
    target: 'es2020',
    minify: 'esbuild',
    chunkSizeWarningLimit: 1000
  },
  esbuild: {
    target: 'es2020',
    drop: process.env.NODE_ENV === 'production' ? ['console', 'debugger'] : []
  },
  server: {
    hmr: {
      overlay: false
    },
    host: true,
    port: 5173,
    strictPort: false
  },
  preview: {
    port: 4173,
    strictPort: false
  },
  define: {
    global: 'globalThis'
  }
});