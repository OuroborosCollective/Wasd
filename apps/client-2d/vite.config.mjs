import { defineConfig } from "vite";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));

let reactPlugin = () => [];
try {
  const mod = await import("../../client/node_modules/@vitejs/plugin-react/dist/index.js");
  reactPlugin = mod.default || mod;
} catch {
  try {
    const mod = await import("@vitejs/plugin-react");
    reactPlugin = mod.default || mod;
  } catch {
    reactPlugin = () => [];
  }
}

export default defineConfig({
  plugins: [reactPlugin()],
  resolve: {
    alias: [
      { find: "@wasd/core-network", replacement: path.resolve(root, "./src/networkClient.ts") },
      { find: "@wasd/shared/world", replacement: path.resolve(root, "../../packages/shared/src/world/index.ts") },
      { find: "@wasd/shared", replacement: path.resolve(root, "../../packages/shared/src/index.ts") }
    ]
  },
  server: {
    port: 5173,
    host: true
  },
  build: {
    outDir: "dist",
    emptyOutDir: true
  },
  base: "/2d/"
});
