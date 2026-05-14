import { defineConfig } from "vitest/config";

/**
 * Subset of Vitest suites for the DGCC gate: excludes flaky / environment-heavy
 * suites so `pnpm run dgcc` stays usable without Docker Postgres or browser DOM.
 */
const DGCC_EXCLUDED_TESTS = [
  "server/src/tests/persistence-flow.test.ts",
  "server/src/tests/npc-memory-chat.test.ts",
  "server/src/tests/*auth-proxy-resolution.test.ts",
  "server/src/tests/selfhealing-system.test.ts",
  "server/src/tests/client-config-route.test.ts",
  "server/src/tests/worldtick-persistence-init.test.ts",
  "server/src/tests/chunk-system.test.ts",
  "server/src/tests/proximity.test.ts",
  "server/src/tests/use-skill-ws.test.ts",
  "server/src/tests/combat-ws.test.ts",
  "server/src/tests/database.test.ts",
  "portal/src/community/EchoTracker.test.ts",
  "client/src/ui/redesign/EquipmentPanel.test.tsx",
  "client/src/ui/redesign/InventorySystem.test.tsx",
  "client/src/ui/redesign/NewHud_UX.test.tsx",
];

export default defineConfig({
  test: {
    setupFiles: ["./vitest.dgcc-setup.ts"],
    include: [
      "server/src/tests/**/*.test.ts",
      "client/src/**/*.test.ts",
      "client/src/**/*.test.tsx",
      "portal/src/**/*.test.ts",
    ],
    exclude: ["**/node_modules/**", "**/dist/**", ...DGCC_EXCLUDED_TESTS],
    environment: "node",
    server: {
      deps: {
        external: ["multer"],
      },
    },
  },
});
