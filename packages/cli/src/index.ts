#!/usr/bin/env node
import { Command } from "commander";
import { buildManifestFile } from "./manifest.js";
import { watch as watchSnippets } from "./watch.js";
import { brand, logEvent } from "./logger.js";
import { DuplicateSlugError } from "./errors.js";

const program = new Command();
program
  .name("mark-down")
  .description(`${brand} CLI for building snippet manifests`)
  .version("0.1.0");

program
  .command("build")
  .argument("[sourceDir]", "directory containing snippets", "content/snippets")
  .option("-o, --output <path>", "where to write snippets-index.json")
  .action(async (sourceDir: string, options: { output?: string }) => {
    try {
      const result = await buildManifestFile({ sourceDir, outputPath: options.output });
      logEvent("info", "manifest.written", {
        outputPath: result.outputPath,
        snippetCount: result.manifest.length
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

program.parseAsync(process.argv).catch(handleError);

function handleError(error: unknown) {
  const err = error as Error;
  if (err instanceof DuplicateSlugError) {
    logEvent("error", "manifest.duplicate_slug", {
      message: err.message,
      slugs: err.duplicates
    });
    process.exit(2);
  }
  logEvent("error", "cli.error", {
    message: err.message,
    stack: err.stack
  });
  process.exit(1);
}
