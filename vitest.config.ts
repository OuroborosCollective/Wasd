import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["server/src/tests/**/*.test.ts", "client/src/**/*.test.ts", "client/src/**/*.test.tsx", "portal/src/**/*.test.ts"],
    environment: "node",
    /** Use file-backed persistence in Vitest so workers do not open real DB pools. */
    env: {
      PERSISTENCE_DRIVER: "file",
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
