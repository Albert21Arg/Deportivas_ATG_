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

      // Vista previa de enlaces: los bots de WhatsApp/Facebook/Telegram no
      // ejecutan la app, así que /tournaments/:id se les pide al backend,
      // que responde con el título y la imagen (p.ej. la de una fecha con
      // ?fecha=AAAA-MM-DD). A cualquier otro visitante Vite le sirve la app.
      '/tournaments': {
        target: 'https://v7n460l4-3000.use.devtunnels.ms',
        changeOrigin: true,
        secure: true,
        bypass: (request) =>
          /whatsapp|facebookexternalhit|telegrambot|twitterbot|slackbot|discordbot|linkedinbot/i.test(
            request.headers['user-agent'] ?? '',
          )
            ? undefined
            : request.url,
      },
    },
  },
});

