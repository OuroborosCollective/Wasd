import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["**/__tests__/**/*.test.ts", "server/src/tests/**/*.test.ts", "server/src/modules/**/*.test.ts", "client/src/**/*.test.ts", "client/src/**/*.test.tsx", "portal/src/**/*.test.ts", "apps/api/src/**/*.test.ts"],
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
