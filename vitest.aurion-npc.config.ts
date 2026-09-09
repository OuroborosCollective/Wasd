import { defineConfig } from "vitest/config";

// These pure server contracts do not load the frontend's PostCSS toolchain.
export default defineConfig({
  css: { postcss: { plugins: [] } },
  test: { environment: "node", include: ["server/src/tests/aurion-npc/**/*.test.ts"] },
});
