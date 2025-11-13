import path from "node:path";
import chokidar from "chokidar";
import { buildManifestFile, type BuildResult } from "./manifest.js";
import { logEvent } from "./logger.js";

export async function watch(sourceDir: string, outputPath?: string) {
  const cwd = path.resolve(sourceDir);
  logEvent("info", "watch.start", {
    directory: cwd,
    outputPath: outputPath ?? path.join(cwd, "snippets-index.json")
  });
  await rebuild(cwd, outputPath);

  const watcher = chokidar.watch(["**/*.md"], {
    cwd,
    ignoreInitial: true,
    awaitWriteFinish: {
      stabilityThreshold: 200,
      pollInterval: 50
    }
  });

  const schedule = debounce(async () => {
    await rebuild(cwd, outputPath);
  }, 150);

  watcher.on("all", (event, filePath) => {
    logEvent("info", "watch.change", { event, file: filePath });
    schedule();
  });
}

async function rebuild(sourceDir: string, outputPath?: string): Promise<BuildResult | void> {
  try {
    const result = await buildManifestFile({ sourceDir, outputPath });
    logEvent("info", "manifest.updated", {
      outputPath: result.outputPath,
      snippetCount: result.manifest.length
    });
    return result;
  } catch (error) {
    const err = error as Error;
    logEvent("error", "manifest.update_failed", {
      message: err.message,
      stack: err.stack
    });
  }
}

function debounce<T extends (...args: unknown[]) => Promise<unknown> | void>(
  fn: T,
  delay: number
) {
  let timer: NodeJS.Timeout | null = null;
  return (...args: Parameters<T>) => {
    if (timer) {
      clearTimeout(timer);
    }
    timer = setTimeout(() => {
      timer = null;
      void fn(...args);
    }, delay);
  };
}
