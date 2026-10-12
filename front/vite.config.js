import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],

  server: {
    allowedHosts: ['deportivas-atg-3000.use.devtunnels.ms'],

    proxy: {
      '/api': {
        target: 'https://deportivas-atg-3000.use.devtunnels.ms',
        changeOrigin: true,
        secure: true,
      },

      '/uploads': {
        target: 'https://deportivas-atg-3000.use.devtunnels.ms',
        changeOrigin: true,
        secure: true,
      },

      '/tournaments': {
        target: 'https://deportivas-atg-3000.use.devtunnels.ms',
        changeOrigin: true,
        secure: true,
      },
    },
  },
});