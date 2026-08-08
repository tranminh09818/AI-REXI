import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Config TEST tạm: chạy frontend trên cổng 5174, proxy /api → backend TEST 5050
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5174,
    historyApiFallback: true,
    hmr: { overlay: false },
    proxy: {
      '/api': { target: 'http://localhost:5050', changeOrigin: true, ws: true },
    },
  },
});
