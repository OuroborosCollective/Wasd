import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      { find: "@wasd/core-network", replacement: path.resolve(root, "./src/networkClient.ts") },
      { find: "@wasd/shared/world", replacement: path.resolve(root, "../../packages/shared/src/world/index.ts") },
      { find: "@wasd/shared", replacement: path.resolve(root, "../../packages/shared/src/index.ts") }
    ]
  },
  server: {
    port: 5173,
    proxy: {
      "/ws": {
        target: "https://arelorian.de",
        ws: true
      }
    }
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    target: "esnext",
    sourcemap: false,
    minify: "esbuild"
  },
  base: "/2d/"
});
