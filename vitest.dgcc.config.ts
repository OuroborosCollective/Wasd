import { defineConfig } from "vitest/config";

/**
 * Fast, deterministic checks for `pnpm run test:dgcc` (DGCC "unit" gate).
 */
export default defineConfig({
  test: {
    include: [
      "server/src/tests/interaction.test.ts",
      "server/src/tests/repo-root.test.ts",
      "server/src/tests/validate-content-core.test.ts",
    ],
    environment: "node",
  },
});
