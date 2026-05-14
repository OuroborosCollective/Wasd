import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@wasd/core-network': path.resolve('/workspace/project/Wasd/packages/core-network/src'),
      'socket.io-client': path.resolve('/workspace/project/Wasd/apps/client-2d/node_modules/socket.io-client')
    }
  },
  server: {
    port: 5173,
    host: true
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      external: ['socket.io-client']
    }
  },
  base: '/'
});
