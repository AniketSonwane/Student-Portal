import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    host: '0.0.0.0',
    open: false,
    proxy: {
      '/api/sheets-proxy': {
        target: 'https://docs.google.com',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/api\/sheets-proxy/, ''),
      },
    },
  },
});
