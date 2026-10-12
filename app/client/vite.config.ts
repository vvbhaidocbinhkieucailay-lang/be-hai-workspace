import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('.', import.meta.url));

// Chế độ phát triển: Vite (127.0.0.1:5173) chuyển /api tới máy chủ cục bộ (npm run serve, cổng 5178).
export default defineConfig({
  root,
  plugins: [react()],
  build: { outDir: 'dist', emptyOutDir: true, sourcemap: false },
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:5178',
        changeOrigin: true,
        configure: (proxy) => {
          // Máy chủ chỉ chấp nhận Origin cùng nguồn; khi dev, bỏ Origin của Vite (cùng máy) trước khi chuyển tiếp.
          proxy.on('proxyReq', (req) => req.removeHeader('origin'));
        },
      },
    },
  },
});
