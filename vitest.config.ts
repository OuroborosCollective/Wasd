import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: [
      "server/src/tests/**/*.test.ts",
      "client/src/**/*.test.ts",
      "client/src/**/*.test.tsx",
      "portal/src/**/*.test.ts",
      "backend/src/core/__tests__/**/*.test.ts"
    ],
    environment: "node",
    server: {
      deps: {
        external: [
          "multer",
        ],
      },
    },
  },
});
