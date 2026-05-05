import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const isItchBuild = mode === "itch";

  return {
    // Relative base for itch.io builds ensures assets load correctly regardless of subfolder
    base: isItchBuild ? "./" : "/",
    resolve: {
      alias: {
        "@shared": path.resolve(__dirname, "../packages/shared/src"),
      },
    },
    server: {
      port: 3001,
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
      headers: {
        "Cross-Origin-Opener-Policy": "same-origin",
        "Cross-Origin-Embedder-Policy": "require-corp",
      },
    },
    plugins: [
      react(),
      {
        name: "wasm-mime-type",
        configureServer(server) {
          server.middlewares.use((req, res, next) => {
            if (req.url?.endsWith(".wasm")) {
              res.setHeader("Content-Type", "application/wasm");
            }
            next();
          });
        },
      },
    ],
    build: {
      outDir: isItchBuild ? "dist-itch" : "dist",
      emptyOutDir: true,
      // Production optimizations
      minify: "esbuild",
      cssCodeSplit: true,
      assetsInlineLimit: 4096, // Inline small assets under 4kb
      sourcemap: process.env.VITE_BUILD_SOURCEMAP === "1",
      reportCompressedSize: false,
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        input: isItchBuild
          ? { main: path.resolve(__dirname, "index.itch.html") }
          : {
              main: path.resolve(__dirname, "index.html"),
              playtester_monitor: path.resolve(__dirname, "playtester-monitor.html"),
            },
        output: {
          // Optimized chunking strategy for heavy 3D libraries
          manualChunks(id) {
            if (id.includes("node_modules/@babylonjs/loaders")) return "babylon-loaders";
            if (id.includes("node_modules/@babylonjs/core")) return "babylon-core";
            if (id.includes("node_modules")) return "vendor";
          },
          // Clean asset naming for production
          entryFileNames: "assets/[name]-[hash].js",
          chunkFileNames: "assets/[name]-[hash].js",
          assetFileNames: "assets/[name]-[hash].[ext]",
        },
      },
    },
  };
});
