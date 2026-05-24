import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    include: [
      "server/src/tests/**/*.test.ts",
      "client/src/**/*.test.ts",
      "client/src/**/*.test.tsx",
      "portal/src/**/*.test.ts",
      "backend/src/tests/**/*.test.ts"
    ],
    environment: "node",
    alias: {
      "../../server/src/modules/brain/RealityFissureBrain.js": path.resolve(__dirname, "./server/src/modules/brain/RealityFissureBrain.ts")
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
