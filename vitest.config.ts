import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    include: ["**/__tests__/**/*.test.ts", "server/src/tests/**/*.test.ts", "server/src/modules/**/*.test.ts", "client/src/**/*.test.ts", "client/src/**/*.test.tsx", "portal/src/**/*.test.ts", "apps/client-2d/src/**/*.test.ts", "apps/client-2d/src/**/*.test.tsx", "apps/api/src/**/*.test.ts"],
    environment: "node",
    server: {
      deps: {
        external: [
          "multer",
        ],
      },
    },
  },
  resolve: {
    alias: {
      "@wasd/shared": path.resolve(__dirname, "./packages/shared/src/index.ts"),
    },
  },
});
