import path from "node:path";
import chokidar from "chokidar";
import { buildManifestFile, type BuildResult } from "./manifest.js";
import { log, logError } from "./logger.js";

export async function watch(sourceDir: string, outputPath?: string) {
  const cwd = path.resolve(sourceDir);
  log(`watching ${cwd}`);
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
    log(`change detected (${event} ${filePath})`);
    schedule();
  });
}

async function rebuild(sourceDir: string, outputPath?: string): Promise<BuildResult | void> {
  try {
    const result = await buildManifestFile({ sourceDir, outputPath });
    log(`manifest updated at ${result.outputPath}`);
    return result;
  } catch (error) {
    logError((error as Error).message);
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
