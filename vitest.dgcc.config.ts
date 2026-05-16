import { defineConfig } from "vitest/config";

/**
 * Narrow Vitest scope for `pnpm run test:dgcc` (DGCC "unit" gate).
 * Keeps the gate fast and independent of optional integrations that
 * require extra services or workspace-only fixtures.
 */
export default defineConfig({
  test: {
    include: ["server/src/tests/validate-content-core.test.ts"],
    environment: "node",
    server: {
      deps: {
        external: ["multer"],
      },
    },
  },
});
