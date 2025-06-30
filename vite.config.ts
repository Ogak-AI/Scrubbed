import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    dedupe: ['react', 'react-dom'],
  },
  optimizeDeps: {
    include: ['react', 'react-dom', '@supabase/supabase-js', 'react-router-dom'],
    exclude: ['lucide-react'],
    force: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom')) {
              return 'react-vendor';
            }
            if (id.includes('@supabase')) {
              return 'supabase-vendor';
            }
            if (id.includes('react-router')) {
              return 'router-vendor';
            }
            if (id.includes('lucide-react')) {
              return 'icons-vendor';
            }
            return 'vendor';
          }
          
          if (id.includes('src/contexts')) {
            return 'contexts';
          }
          if (id.includes('src/hooks')) {
            return 'hooks';
          }
          if (id.includes('src/components/dumper')) {
            return 'dumper-components';
          }
          if (id.includes('src/components/collector')) {
            return 'collector-components';
          }
          if (id.includes('src/components/admin')) {
            return 'admin-components';
          }
          if (id.includes('src/components')) {
            return 'components';
          }
        },
      },
    },
    target: 'es2020',
    minify: 'esbuild',
    chunkSizeWarningLimit: 1000,
  },
  esbuild: {
    target: 'es2020',
    drop: process.env.NODE_ENV === 'production' ? ['console', 'debugger'] : [],
  },
  server: {
    hmr: {
      overlay: false,
    },
    host: true,
    port: 5173,
    strictPort: false,
  },
  preview: {
    port: 4173,
    strictPort: false,
  },
  define: {
    global: 'globalThis',
  },
});