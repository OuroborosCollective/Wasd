import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 3001, // Client dev server port
    fs: {
      allow: ['..']
    },
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
    // Source maps massively increase peak memory usage during bundling.
    // Keep them opt-in for production server builds.
    sourcemap: process.env.VITE_BUILD_SOURCEMAP === "1",
    reportCompressedSize: false,
  }
});
