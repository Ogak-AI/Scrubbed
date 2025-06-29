import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: false, // Disable sourcemaps for production
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // More aggressive chunking for better performance
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
          
          // Separate chunks for different parts of the app
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
    // PERFORMANCE: Optimize chunk size
    chunkSizeWarningLimit: 1000,
  },
  optimizeDeps: {
    include: ['react', 'react-dom', '@supabase/supabase-js', 'react-router-dom'],
    exclude: ['lucide-react'],
  },
  esbuild: {
    target: 'es2020',
    // PERFORMANCE: Remove console logs in production
    drop: process.env.NODE_ENV === 'production' ? ['console', 'debugger'] : [],
  },
  // PERFORMANCE: Enable compression
  server: {
    hmr: {
      overlay: false, // Disable error overlay for better performance
    },
  },
});