import { defineConfig } from "tsup";

export default defineConfig([
  {
    entry: {
      index: "src/index.ts",
      slug: "src/slug.ts",
      inline: "src/inline.ts",
      "angular/index": "src/angular/index.ts"
    },
    format: ["esm"],
    dts: true,
    sourcemap: true,
    clean: true,
    target: "es2020",
    external: ["@angular/core", "@angular/common", "@angular/router", "@angular/platform-browser", "rxjs"],
    outExtension() {
      return {
        js: ".js"
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
  },
  {
    entry: {
      "mark-down-inline": "src/inline.ts"
    },
    format: ["iife"],
    globalName: "markDownInline",
    dts: false,
    sourcemap: true,
    clean: false,
    platform: "browser",
    minify: false,
    target: "es2018",
    splitting: false,
    outExtension() {
      return {
        js: ".umd.js"
      };
    }
  }
]);
