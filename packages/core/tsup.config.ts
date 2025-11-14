import { defineConfig } from "tsup";

export default defineConfig([
  {
    entry: {
      index: "src/index.ts",
      slug: "src/slug.ts"
    },
    format: ["esm", "cjs"],
    dts: true,
    sourcemap: true,
    clean: true,
    target: "es2020",
    outExtension({ format }) {
      return {
        js: format === "cjs" ? ".cjs" : ".mjs"
      };
    }
  },
  {
    entry: {
      browser: "src/browser.ts"
    },
    format: ["esm"],
    dts: true,
    sourcemap: true,
    clean: false,
    target: "es2020",
    platform: "browser",
    splitting: false,
    outExtension() {
      return {
        js: ".js"
      };
    }
  }
]);
