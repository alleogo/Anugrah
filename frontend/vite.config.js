import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0', // Listen on all network interfaces including 127.0.0.1 and localhost
    port: 5005,
    strictPort: false,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:4004',
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
