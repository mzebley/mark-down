#!/usr/bin/env node
import { Command } from "commander";
import { buildManifestFile } from "./manifest.js";
import { watch as watchSnippets } from "./watch.js";
import { brand, logEvent } from "./logger.js";
import { DuplicateSlugError } from "./errors.js";
import { compilePage } from "./compile-page.js";
import type { SanitizeOptions, SanitizePolicy } from "@mzebley/mark-down";

const program = new Command();
program
  .name("mark-down")
  .description(`${brand} CLI for building snippet manifests`)
  .version("1.2.1");

program
  .command("build")
  .argument("[sourceDir]", "directory containing snippets", "content/snippets")
  .option("-o, --output <path>", "where to write snippets-index.json")
  .action(async (sourceDir: string, options: { output?: string }) => {
    try {
      const result = await buildManifestFile({
        sourceDir,
        outputPath: options.output,
      });
      logEvent("info", "manifest.written", {
        outputPath: result.outputPath,
        snippetCount: result.manifest.length,
      });
    } catch (error) {
      handleError(error);
    }
  });

program
  .command("watch")
  .argument("[sourceDir]", "directory containing snippets", "content/snippets")
  .option("-o, --output <path>", "where to write snippets-index.json")
  .action(async (sourceDir: string, options: { output?: string }) => {
    try {
      await watchSnippets(sourceDir, options.output);
    } catch (error) {
      handleError(error);
    }
  });

program
  .command("compile-page")
  .argument("<inputHtml>", "HTML file containing data-snippet placeholders")
  .option("--manifest <path>", "path to snippets-index.json")
  .option("--outDir <path>", "output directory for compiled HTML", "dist")
  .option(
    "--inPlace",
    "overwrite the input HTML file instead of writing to outDir",
  )
  .option(
    "--sanitize [policy]",
    "sanitize rendered HTML (default|strict|permissive)",
  )
  .action(
    async (
      inputHtml: string,
      options: {
        manifest?: string;
        outDir?: string;
        inPlace?: boolean;
        sanitize?: string | boolean;
      },
    ) => {
      try {
        await compilePage(inputHtml, {
          manifest: options.manifest,
          outDir: options.outDir,
          inPlace: options.inPlace,
          sanitize: resolveSanitizeOption(options.sanitize),
        });
      } catch (error) {
        handleError(error);
      }
    },
  );

program.parseAsync(process.argv).catch(handleError);

function handleError(error: unknown) {
  const err = error as Error;
  if (err instanceof DuplicateSlugError) {
    logEvent("error", "manifest.duplicate_slug", {
      message: err.message,
      slugs: err.duplicates,
    });
    process.exit(2);
  }
  logEvent("error", "cli.error", {
    message: err.message,
    stack: err.stack,
  });
  process.exit(1);
}

function resolveSanitizeOption(
  value?: string | boolean,
): SanitizeOptions | undefined {
  if (!value) {
    return undefined;
  }
  if (value === true) {
    return { policy: "default" };
  }
  const policy = value.trim();
  if (!policy) {
    return { policy: "default" };
  }
  if (!isSanitizePolicy(policy)) {
    throw new Error(`Unknown sanitize policy '${policy}'.`);
  }
  return { policy };
}

function isSanitizePolicy(value: string): value is SanitizePolicy {
  return value === "default" || value === "strict" || value === "permissive";
}
