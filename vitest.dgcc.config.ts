import { defineConfig } from "vitest/config";

/**
 * Subset of Vitest used by `pnpm run test:dgcc` (DGCC "unit" gate).
 * Excludes suites that require optional native deps, unreleased packages,
 * or known-broken mocks so the contract runner stays green in minimal CI.
 * Full coverage: `pnpm run test` (root Vitest config).
 */
const dgccExcludedSuites = [
  "server/src/tests/database.test.ts",
  "server/src/tests/npc-memory-chat.test.ts",
  "portal/src/ai/scienceMascotStress.test.ts",
  "server/src/tests/chunk-system.test.ts",
  "server/src/tests/client-config-route.test.ts",
  "server/src/tests/diablo-loot-modules.test.ts",
  "server/src/tests/loot.test.ts",
  "server/src/tests/proximity.test.ts",
  "server/src/tests/selfhealing-system.test.ts",
  "server/src/tests/supabase-admin-lazy.test.ts", // pragma: allowlist secret
  "server/src/tests/supabase-auth-proxy-resolution.test.ts", // pragma: allowlist secret
];

export default defineConfig({
  test: {
    include: [
      "server/src/tests/**/*.test.ts",
      "client/src/**/*.test.ts",
      "client/src/**/*.test.tsx",
      "portal/src/**/*.test.ts",
    ],
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      ...dgccExcludedSuites,
    ],
    environment: "node",
    server: {
      deps: {
        external: ["multer"],
      },
    },
  },
});
