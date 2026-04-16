import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["server/src/tests/**/*.test.ts", "client/src/**/*.test.ts"],
    environment: "node",
    server: {
      deps: {
        inline: ["@supabase/supabase-js"],
        external: [
          "multer",
          "firebase/auth",
          "firebase/firestore",
        ],
      },
    },
  },
});
