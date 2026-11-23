import { defineConfig } from "vite";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const sharedSrc = path.resolve(root, "../../packages/shared/src");

let reactPlugin;
try {
  const reactModule = await import("../../client/node_modules/@vitejs/plugin-react/dist/index.js");
  reactPlugin = (reactModule.default || reactModule)();
} catch (e) {
  reactPlugin = [];
}

export default defineConfig({
  plugins: [reactPlugin],
  resolve: {
    alias: [
      { find: "@wasd/core-network", replacement: path.resolve(root, "./src/networkClient.ts") },
      { find: "@wasd/shared", replacement: path.resolve(sharedSrc, "./index.js") },
      { find: "@wasd/shared/world", replacement: path.resolve(sharedSrc, "./world/index.js") },
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
