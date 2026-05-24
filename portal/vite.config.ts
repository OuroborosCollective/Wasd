import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

const root = path.dirname(fileURLToPath(import.meta.url));

/**
 * Vite + Vitest (single config).
 * @vitejs/plugin-react 6.x targets Vite 6 and pulls `vite/internal` — incompatible with Vite 5 → stay on plugin-react 4.x.
 */
export default defineConfig({
  base: process.env.VITE_BASE_PATH || "/portal/",
  plugins: [react()],
  resolve: {
    alias: {
      "@wasd/shared": path.resolve(root, "../packages/shared/src/index.ts"),
    },
  },
  optimizeDeps: {
    include: ["react", "react-dom", "react-dom/client", "eventemitter3"],
  },
  build: {
    target: "es2022",
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    passWithNoTests: false,
  },
});
