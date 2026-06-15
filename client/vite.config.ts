import path from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv, type PluginOption } from "vite";

// ESM __dirname compatibility for Sovereign Standard Architecture
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function wasmMimeTypePlugin(): PluginOption {
  return {
    name: "wasm-mime-type",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url?.endsWith(".wasm")) {
          res.setHeader("Content-Type", "application/wasm");
        }
        next();
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  // Load environment variables for cross-service synchronization
  const env = loadEnv(mode, process.cwd(), "");
  const isItchBuild = mode === "itch";
  const isProduction = mode === "production";
  const isVitest = mode === "test" || process.env.NODE_ENV === "test" || process.env.VITEST === "true";

  // Dynamic HMR clientPort: 443 for cloud/SSL environments, undefined for local
  const isSsl = env.VITE_DEV_SERVER_HTTPS === "true" || env.NODE_ENV === "production";
  const hmrClientPort = isSsl ? 443 : undefined;

  return {
    // Relative base for itch.io builds ensures assets load correctly regardless of subfolder
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
      hmr: {
        clientPort: hmrClientPort,
      },
      fs: {
        allow: [".."],
      },
      proxy: {
        "/api": {
          target: env.VITE_API_URL || "http://localhost:3000",
          changeOrigin: true,
        },
        "/ws": {
          target: env.VITE_WS_URL || "ws://localhost:3000",
          ws: true,
        },
      },
      headers: {
        "Cross-Origin-Opener-Policy": "same-origin",
        "Cross-Origin-Embedder-Policy": "require-corp",
      },
    },
    plugins: [
      // Vitest under Vite 8 already uses the OXC transform path. Loading the
      // Babel React plugin during tests adds esbuild/oxc deprecation noise.
      !isVitest ? react() : null,
      wasmMimeTypePlugin(),
    ].filter(Boolean) as PluginOption[],
    build: {
      outDir: isItchBuild ? "dist-itch" : "dist",
      emptyOutDir: true,
      target: "esnext",
      minify: "esbuild",
      cssCodeSplit: true,
      assetsInlineLimit: 4096,
      sourcemap: env.VITE_BUILD_SOURCEMAP === "1",
      reportCompressedSize: false,
      chunkSizeWarningLimit: 2000,
      // Remove console.log in production
      pureAnnotations: isProduction ? ["console.log", "console.debug", "console.info"] : [],
      rollupOptions: {
        input: isItchBuild
          ? { main: path.resolve(__dirname, "index.itch.html") }
          : {
              main: path.resolve(__dirname, "index.html"),
              dashboard: path.resolve(__dirname, "dashboard.html"),
              playtester_monitor: path.resolve(__dirname, "playtester-monitor.html"),
            },
        output: {
          // Optimized chunking strategy for Areloria WASD (Three.js focus)
          manualChunks(id) {
            if (id.includes("node_modules/three")) return "threejs-core";
            if (id.includes("node_modules/@react-three")) return "threejs-react";
            if (id.includes("node_modules/lucide-react")) return "ui-icons";
            if (id.includes("node_modules/cannon-es") || id.includes("node_modules/rapier")) return "physics-engine";
            if (id.includes("node_modules/babylonjs")) return "babylonjs-core";
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
