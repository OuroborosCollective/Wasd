import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const isItchBuild = mode === "itch";
  const isProduction = mode === "production";
  const isSsl = env.VITE_DEV_SERVER_HTTPS === "true" || env.NODE_ENV === "production";
  const hmrClientPort = isSsl ? 443 : undefined;
  const minify = isProduction ? "esbuild" : "esbuild";

  return {
    base: isItchBuild ? "./" : "/",
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
        "@shared": path.resolve(__dirname, "../packages/shared/src"),
        "@wasd/shared": path.resolve(__dirname, "../packages/shared/dist"),
        "@assets": path.resolve(__dirname, "./src/assets"),
      },
    },
    server: {
      port: 3001,
      host: true,
      hmr: { clientPort: hmrClientPort },
      fs: { allow: [".."] },
      proxy: {
        "/api": { target: env.VITE_API_URL || "http://localhost:3000", changeOrigin: true },
        "/ws": { target: env.VITE_WS_URL || "ws://localhost:3000", ws: true },
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
            if (req.url?.endsWith(".wasm")) res.setHeader("Content-Type", "application/wasm");
            next();
          });
        },
      },
    ],
    esbuild: { target: "es2022" },
    build: {
      outDir: isItchBuild ? "dist-itch" : "dist",
      emptyOutDir: true,
      target: "es2022",
      minify: minify,
      cssCodeSplit: true,
      assetsInlineLimit: 4096,
      sourcemap: env.VITE_BUILD_SOURCEMAP === "1",
      reportCompressedSize: false,
      chunkSizeWarningLimit: 2000,
      pureAnnotations: isProduction ? ["console.log", "console.debug", "console.info"] : [],
      rollupOptions: {
        input: isItchBuild
          ? { main: path.resolve(__dirname, "index.itch.html") }
          : {
              main: path.resolve(__dirname, "index.html"),
              playtester_monitor: path.resolve(__dirname, "playtester-monitor.html"),
            },
        output: {
          manualChunks(id) {
            if (id.includes("node_modules/three")) return "threejs-core";
            if (id.includes("node_modules/@react-three")) return "threejs-react";
            if (id.includes("node_modules/lucide-react")) return "ui-icons";
            if (id.includes("node_modules/cannon-es") || id.includes("node_modules/rapier")) return "physics-engine";
            if (id.includes("node_modules/babylonjs")) return "babylonjs-core";
            if (id.includes("node_modules")) return "vendor";
          },
          entryFileNames: "assets/[name]-[hash].js",
          chunkFileNames: "assets/[name]-[hash].js",
          assetFileNames: "assets/[name]-[hash].[ext]",
        },
      },
    },
  };
});
