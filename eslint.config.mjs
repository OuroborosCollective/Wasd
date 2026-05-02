import path from "node:path";
import { fileURLToPath } from "node:url";
import tsParser from "@typescript-eslint/parser";
import tsPlugin from "@typescript-eslint/eslint-plugin";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
      "**/*.mjs",
      "**/*.cjs"
    ],
  },
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      parser: tsParser,
    },
    plugins: {
      "@typescript-eslint": tsPlugin,
    },
    rules: {
      // Minimal rules
    },
  },
];

export default eslintConfig;
