import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      'react-native': 'react-native-web',
      // Add any other aliases needed for react-native-web packages
    },
    extensions: ['.web.js', '.js', '.jsx', '.json']
  },
  optimizeDeps: {
    include: ['react-native-web']
  },
  build: {
    rollupOptions: {
      external: [
        // Add any external dependencies that should not be bundled
      ]
    }
  }
});