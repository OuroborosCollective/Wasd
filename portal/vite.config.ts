import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

const root = path.dirname(fileURLToPath(import.meta.url));

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
  esbuild: { target: "es2022" },
  build: {
    target: "es2022",
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    passWithNoTests: false,
  },
});
