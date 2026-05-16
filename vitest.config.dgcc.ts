import { defineConfig } from "vitest/config";

/**
 * Subset of the suite used by `pnpm run test:dgcc` (DGCC `unit` check).
 * Full coverage remains `pnpm run test` (default vitest.config.ts).
 */
export default defineConfig({
  test: {
    environment: "node",
    include: [
      "server/src/tests/interaction.test.ts",
      "server/src/tests/misc-modules.test.ts",
      "packages/shared/src/**/*.test.ts",
    ],
    server: {
      deps: {
        external: ["multer"],
      },
    },
  },
});
