import { configDefaults, defineConfig } from "vite-plus";

export default defineConfig({
  test: {
    // Agent worktrees hold full copies of the repo; without this, `vp test` in the main checkout runs them too.
    exclude: [...configDefaults.exclude, ".claude/worktrees/**"],
  },
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
      ".claude/worktrees/**",
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
      ".claude/worktrees/**",
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
    // Hand-written copies of native helpers (CODING_STANDARDS.md, "One helper per domain value").
    "apps/native/**/*.{ts,tsx}": "node scripts/check-domain-helpers.mjs",
  },
});
