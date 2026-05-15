import { defineConfig } from "vitest/config";

/**
 * Subset of Vitest used by DGCC `unit` check: design/gameplay consistency and
 * protocol/content invariants without the full integration / WS matrix.
 */
export default defineConfig({
  test: {
    include: [
      "server/src/tests/resolve-world-assets-dir.test.ts",
      "server/src/tests/validate-content-core.test.ts",
      "server/src/tests/protocol-types.test.ts",
      "packages/shared/src/**/*.test.ts",
      "client/src/**/*.test.ts",
      "client/src/**/*.test.tsx",
    ],
    environment: "node",
    server: {
      deps: {
        external: ["multer"],
      },
    },
  },
});
