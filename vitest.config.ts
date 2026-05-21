import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: [
      "server/src/tests/**/*.test.ts",
      "server/src/core/**/*.test.ts",
      "client/src/**/*.test.ts",
      "client/src/**/*.test.tsx",
      "portal/src/**/*.test.ts"
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
