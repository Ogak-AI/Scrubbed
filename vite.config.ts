import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: true, // Enable sourcemaps for better debugging
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // More granular chunking to avoid circular dependencies
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
          if (id.includes('src/components')) {
            return 'components';
          }
        },
      },
    },
    target: 'es2020',
    minify: 'esbuild',
  },
  optimizeDeps: {
    include: ['react', 'react-dom', '@supabase/supabase-js', 'react-router-dom'],
    exclude: ['lucide-react'],
  },
  esbuild: {
    target: 'es2020',
  },
});