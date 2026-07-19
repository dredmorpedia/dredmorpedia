import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypeScript from "eslint-config-next/typescript";
import tseslint from "typescript-eslint";

const webFiles = ["apps/web/**/*.{js,mjs,cjs,jsx,ts,tsx}"];
const webOnly = (configs) =>
  configs.map((config) => ({
    ...config,
    files: webFiles,
  }));

export default defineConfig(
  globalIgnores([
    "legacy/**",
    "data/generated/**",
    "**/.next/**",
    "**/out/**",
    "**/dist/**",
    "**/coverage/**",
    "**/playwright-report/**",
    "**/test-results/**",
  ]),
  ...tseslint.configs.recommended,
  ...webOnly(nextVitals),
  ...webOnly(nextTypeScript),
  {
    files: webFiles,
    rules: {
      "@next/next/no-html-link-for-pages": "off",
    },
  },
  {
    files: ["packages/**/*.ts"],
    rules: {
      "@typescript-eslint/consistent-type-imports": "error",
    },
  },
);
