import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    include: ["backend/src/tests/**/*.test.ts", "server/src/tests/**/*.test.ts", "client/src/**/*.test.ts", "client/src/**/*.test.tsx", "portal/src/**/*.test.ts"],
    environment: "node",
    alias: {
      "../../server/src/modules/brain/MatrixPrecognitionBrain.js": path.resolve(__dirname, "server/src/modules/brain/MatrixPrecognitionBrain.ts"),
      "../../../server/src/modules/brain/MatrixPrecognitionBrain.js": path.resolve(__dirname, "server/src/modules/brain/MatrixPrecognitionBrain.ts"),
      "./watchdog-emitter.js": path.resolve(__dirname, "backend/src/core/watchdog-emitter.ts"),
      "../core/watchdog-precognition.js": path.resolve(__dirname, "backend/src/core/watchdog-precognition.ts"),
      "../core/watchdog-emitter.js": path.resolve(__dirname, "backend/src/core/watchdog-emitter.ts"),
      "./watchdog-emitter": path.resolve(__dirname, "backend/src/core/watchdog-emitter.ts"),
      "./axiomatic-event-bus": path.resolve(__dirname, "backend/src/core/axiomatic-event-bus.ts")
    },
    server: {
      deps: {
        external: [
          "multer",
        ],
      },
    },
  },
});
