import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
// ESM __dirname compatibility for Sovereign Standard Architecture
var __filename = fileURLToPath(import.meta.url);
var __dirname = path.dirname(__filename);
export default defineConfig(function (_a) {
    var mode = _a.mode;
    // Load environment variables for cross-service synchronization
    var env = loadEnv(mode, process.cwd(), "");
    var isItchBuild = mode === "itch";
    // Dynamic HMR clientPort: 443 for cloud/SSL environments, undefined for local
    var isSsl = env.VITE_DEV_SERVER_HTTPS === "true" || env.NODE_ENV === "production";
    var hmrClientPort = isSsl ? 443 : undefined;
    return {
        // Relative base for itch.io builds ensures assets load correctly regardless of subfolder
        base: isItchBuild ? "./" : "/",
        resolve: {
            alias: {
                "@": path.resolve(__dirname, "./src"),
                "@shared": path.resolve(__dirname, "../packages/shared/src"),
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
            react(),
            {
                name: "wasm-mime-type",
                configureServer: function (server) {
                    server.middlewares.use(function (req, res, next) {
                        var _a;
                        if ((_a = req.url) === null || _a === void 0 ? void 0 : _a.endsWith(".wasm")) {
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
            sourcemap: env.VITE_BUILD_SOURCEMAP === "1",
            reportCompressedSize: false,
            chunkSizeWarningLimit: 2000, // Adjusted for heavy Three.js/3D dependencies
            rollupOptions: {
                input: isItchBuild
                    ? { main: path.resolve(__dirname, "index.itch.html") }
                    : {
                        main: path.resolve(__dirname, "index.html"),
                        playtester_monitor: path.resolve(__dirname, "playtester-monitor.html"),
                    },
                output: {
                    // Optimized chunking strategy for Areloria WASD (Three.js focus)
                    manualChunks: function (id) {
                        if (id.includes("node_modules/three"))
                            return "threejs-core";
                        if (id.includes("node_modules/@react-three"))
                            return "threejs-react";
                        if (id.includes("node_modules/lucide-react"))
                            return "ui-icons";
                        if (id.includes("node_modules/cannon-es") || id.includes("node_modules/rapier"))
                            return "physics-engine";
                        if (id.includes("node_modules"))
                            return "vendor";
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
