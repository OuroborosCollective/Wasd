import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const root = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      /** Allow Vitest without a prior `pnpm --filter @wasd/shared build` (matches AGENTS gotcha). */
      "@wasd/shared": path.join(root, "packages/shared/src/index.ts"),
    },
  },
  test: {
    /** Default persistence driver for Vitest so a developer `.env` does not override unit tests. */
    env: {
      PERSISTENCE_DRIVER: process.env.PERSISTENCE_DRIVER?.trim() || "file",
    },
    include: ["server/src/tests/**/*.test.ts", "client/src/**/*.test.ts", "client/src/**/*.test.tsx", "portal/src/**/*.test.ts"],
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
