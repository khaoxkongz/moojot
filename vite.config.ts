import { defineConfig } from "vite-plus";

export default defineConfig({
  lint: {
    ignorePatterns: [
      "node_modules/**",
      "**/node_modules/**",
      "apps/web/.next/**",
      "apps/web/out/**",
      "apps/native/.expo/**",
      "apps/native/dist/**",
      "apps/native/web-build/**",
      "apps/native/ios/**",
      "apps/native/android/**",
      "apps/server/dist/**",
      "packages/db/dist/**",
      "packages/api/dist/**",
      "packages/auth/dist/**",
      "packages/db/prisma/generated/**",
      "docs/design/**",
      ".agents/**",
    ],
    options: {
      typeAware: false,
      typeCheck: false,
    },
    overrides: [
      {
        // Shared native layers sit below features; a feature may import them, never the reverse.
        files: ["apps/native/lib/**", "apps/native/components/**", "apps/native/constants/**"],
        rules: {
          "no-restricted-imports": [
            "error",
            {
              patterns: [
                {
                  group: ["@/features/**", "**/features/**"],
                  message: "Shared layers must not import from features/. Move the shared code down instead.",
                },
              ],
            },
          ],
        },
      },
    ],
  },
  fmt: {
    ignorePatterns: [
      "node_modules/**",
      "**/node_modules/**",
      "apps/web/.next/**",
      "apps/web/out/**",
      "apps/native/.expo/**",
      "apps/native/dist/**",
      "apps/native/web-build/**",
      "apps/native/ios/**",
      "apps/native/android/**",
      "apps/server/dist/**",
      "packages/db/dist/**",
      "packages/api/dist/**",
      "packages/auth/dist/**",
      "packages/db/prisma/generated/**",
      "docs/design/**",
      ".agents/**",
      "skills-lock.json",
    ],
    endOfLine: "lf",
    semi: true,
    singleQuote: false,
    tabWidth: 2,
    trailingComma: "es5",
    printWidth: 120,
    sortPackageJson: true,
  },
  staged: {
    "*.{js,ts,jsx,tsx,vue,svelte,json,jsonc,css,md}": "vp check --fix",
    // Not part of the built-in `vp check` (Oxlint can't read Markdown), so tickets get their own check.
    ".scratch/**/issues/*.md": "node scripts/check-tickets.mjs",
  },
});
