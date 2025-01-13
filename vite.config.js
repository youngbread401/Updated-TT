import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  base: './',
  plugins: [react()],
  define: {
    'process.env': {}
  },
  resolve: {
    alias: {
      'react-native': 'react-native-web',
      '@': resolve(__dirname, 'src')
    },
    extensions: ['.web.js', '.js', '.jsx', '.json']
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    commonjsOptions: {
      transformMixedEsModules: true
    },
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
      },
    }
  },
  optimizeDeps: {
    include: ['react-native-web']
  },
  server: {
    port: 3000,
    open: true
  }
});