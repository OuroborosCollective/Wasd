import { defineConfig } from "vitest/config";

/**
 * Fast Vitest slice used by `pnpm run test:dgcc` / DGCC `unit` check.
 * Keeps the contract gate reliable without running the full monorepo suite.
 */
export default defineConfig({
  test: {
    include: ["server/src/tests/dgcc-smoke.test.ts", "server/src/tests/audit-content-model-paths.test.ts"],
    environment: "node",
    server: {
      deps: {
        external: ["multer"],
      },
    },
  },
});
