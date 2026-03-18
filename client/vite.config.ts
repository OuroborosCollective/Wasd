import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 3001, // Client dev server port
    allowedHosts: 'all',
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/ws': {
        target: 'ws://localhost:3000',
        ws: true,
      }
    }
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: true,
    rollupOptions: {
      external: (id: string) => id.startsWith('firebase/')
    }
  }
});
