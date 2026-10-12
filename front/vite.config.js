import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],

  server: {
    allowedHosts: ['qs0p5djd-3000.use.devtunnels.ms'],

    proxy: {
      '/api': {
        target: 'https://qs0p5djd-3000.use.devtunnels.ms',
        changeOrigin: true,
        secure: true,
      },

      '/uploads': {
        target: 'https://qs0p5djd-3000.use.devtunnels.ms',
        changeOrigin: true,
        secure: true,
      },

      '/tournaments': {
        target: 'https://qs0p5djd-3000.use.devtunnels.ms',
        changeOrigin: true,
        secure: true,
      },
    },
  },
});