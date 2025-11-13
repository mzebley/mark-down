import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@mzebley/mark-down": path.resolve(__dirname, "packages/core/src/index.ts")
    }
  },
  test: {
    globals: true,
    include: ["tests/**/*.spec.ts"],
    coverage: {
      reporter: ["text", "html"]
    }
  }
});
