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
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules/@babylonjs")) {
            return "babylon";
          }
          if (id.includes("node_modules/firebase")) {
            return "firebase";
          }
        },
      },
    },
  },
});
