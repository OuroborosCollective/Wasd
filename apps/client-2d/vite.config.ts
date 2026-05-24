import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/ws": {
        target: "https://arelorian.de",
        ws: true
      }
    }
  },
  esbuild: { target: "es2022" },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    target: "es2022",
    sourcemap: false,
    minify: "esbuild"
  },
  base: "/2d/"
});
