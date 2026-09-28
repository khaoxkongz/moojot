import { defineConfig } from "vite-plus/pack";

export default defineConfig({
  entry: "./src/index.ts",
  format: "esm",
  outDir: "./dist",
  clean: true,
  deps: {
    // tsdown <0.23 compatibility: resolve external dependency subpaths.
    // Remove to preserve subpath imports as written (the new default).
    // https://tsdown.dev/options/dependencies#deps-resolvedepsubpath
    resolveDepSubpath: true,
    alwaysBundle: [/@moojot\/.*/],
  },
});
