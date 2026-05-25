import { defineConfig, mergeConfig } from "vite";
import baseConfig from "./vite.config";

export default mergeConfig(baseConfig, defineConfig({
  base: "./",
  build: {
    outDir: "dist-itch",
    emptyOutDir: true,
    target: "esnext",
    sourcemap: false,
    minify: "esbuild"
  },
  define: {
    __ARELORIA_EXPORT_TARGET__: JSON.stringify("itch.io")
  }
}));
