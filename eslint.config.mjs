import path from "node:path";
import { fileURLToPath } from "node:url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  {
    ignores: [
      "dist/**",
      "node_modules/**",
      "client/dist/**",
      "server/dist/**",
      "e2e/**",
      "playwright.config.ts",
      "**/*.js",
    ],
  },
  ...compat.extends("next"),
  ...compat.extends("next/core-web-vitals"),
  {
    rules: {
      // Hier können zusätzliche Regeln hinzugefügt werden
    },
  },
];

export default eslintConfig;