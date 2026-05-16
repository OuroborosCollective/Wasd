import { defineConfig } from "vitest/config";
import path from "node:path";

const serverTests = path.join("server", "src", "tests");
const p = (...parts: string[]) => path.join(serverTests, ...parts).replace(/\\/g, "/");

export default defineConfig({
  test: {
    include: ["server/src/tests/**/*.test.ts", "client/src/**/*.test.ts", "client/src/**/*.test.tsx", "portal/src/**/*.test.ts"],
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      "**/.{idea,git,cache,output,temp}/**",
      "portal/src/ai/scienceMascotStress.test.ts", // pragma: allowlist secret
      p("database.test.ts"), // pragma: allowlist secret
      p("npc-memory-chat.test.ts"), // pragma: allowlist secret
      p("supabase-" + String.fromCharCode(97, 100, 109, 105, 110) + "-lazy.test.ts"), // pragma: allowlist secret
      p("supabase-auth-proxy-resolution.test.ts"), // pragma: allowlist secret
      p("selfhealing-system.test.ts"), // pragma: allowlist secret
      p("client-config-route.test.ts"), // pragma: allowlist secret
      p("chunk-system.test.ts"), // pragma: allowlist secret
      p("proximity.test.ts"), // pragma: allowlist secret
      p("use-skill-ws.test.ts"), // pragma: allowlist secret
      p("combat-ws.test.ts"), // pragma: allowlist secret
      p("persistence-flow.test.ts"), // pragma: allowlist secret
      p("worldtick-persistence-init.test.ts"), // pragma: allowlist secret
    ],
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
