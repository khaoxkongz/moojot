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
    ],
    options: {
      typeAware: false,
      typeCheck: false,
    },
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
  },
});
