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
          if (id.includes("node_modules/@babylonjs/loaders")) {
            return "babylon-loaders";
          }
          if (id.includes("node_modules/@babylonjs")) {
            return "babylon-core";
          }
          if (id.includes("node_modules/firebase")) {
            return "firebase";
          }
          if (id.includes("/src/ui/inventory") || id.includes("/src/ui/skillsPanel")) {
            return "ui-panels-a";
          }
          if (id.includes("/src/ui/questLog") || id.includes("/src/ui/equipmentPanel")) {
            return "ui-panels-b";
          }
          if (id.includes("/src/ui/mobileSceneTeleportPanel")) {
            return "ui-mobile-teleport";
          }
          if (id.includes("/src/utils/PerformanceMonitor")) {
            return "perf-monitor";
          }
        },
      },
    },
  },
});
