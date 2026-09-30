import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],

  server: {
    allowedHosts: ['v7n460l4-5173.use.devtunnels.ms'],

    proxy: {
      '/api': {
        target: 'https://v7n460l4-3000.use.devtunnels.ms',
        changeOrigin: true,
        secure: true,
      },

      '/uploads': {
        target: 'https://v7n460l4-3000.use.devtunnels.ms',
        changeOrigin: true,
        secure: true,
      },

      '/tournaments': {
        target: 'https://v7n460l4-3000.use.devtunnels.ms',
        changeOrigin: true,
        secure: true,
      },
    },
  },
});