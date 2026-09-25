import path from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 5173,
    // Dev-only: forward /api to the local API server so the browser sees one origin.
    proxy: {
      '/api': {
        target: process.env['VITE_DEV_API_PROXY'] ?? 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  preview: {
    port: Number(process.env['PORT'] ?? 4173),
    host: '0.0.0.0',
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
