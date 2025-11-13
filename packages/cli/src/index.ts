#!/usr/bin/env node
import { Command } from "commander";
import { buildManifestFile } from "./manifest.js";
import { watch as watchSnippets } from "./watch.js";
import { log, logError, brand } from "./logger.js";
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
      log(`manifest written to ${result.outputPath}`);
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
    logError(err.message);
    process.exit(2);
  }
  logError(err.message);
  process.exit(1);
}
