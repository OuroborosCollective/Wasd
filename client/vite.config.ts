import path from "node:path";
import { defineConfig } from "vite";

export default defineConfig(({ mode }) => {
  const isItchBuild = mode === "itch";
  return {
    server: {
      port: 3001, // Client dev server port
      fs: {
        allow: [".."],
      },
      proxy: {
        "/api": {
          target: "http://localhost:3000",
          changeOrigin: true,
        },
        "/ws": {
          target: "ws://localhost:3000",
          ws: true,
        },
      },
    },
    build: {
      outDir: isItchBuild ? "dist-itch" : "dist",
      emptyOutDir: true,
      // Source maps massively increase peak memory usage during bundling.
      // Keep them opt-in for production server builds.
      sourcemap: process.env.VITE_BUILD_SOURCEMAP === "1",
      reportCompressedSize: false,
      rollupOptions: {
        input: isItchBuild
          ? path.resolve(__dirname, "index.itch.html")
          : path.resolve(__dirname, "index.html"),
        output: {
          manualChunks(id) {
            if (id.includes("node_modules/@babylonjs/loaders")) return "babylon-loaders";
            if (id.includes("node_modules/@babylonjs/core")) return "babylon-core";
          },
        },
      },
    },
  };
});
