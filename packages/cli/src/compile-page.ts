import fs from "node:fs/promises";
import path from "node:path";
import { load as loadHtml } from "cheerio";
import { parseFrontMatter, renderMarkdown, type SnippetMeta } from "@mzebley/mark-down";
import { logEvent } from "./logger.js";

export interface CompilePageOptions {
  manifest?: string;
  outDir?: string;
  inPlace?: boolean;
}

const DEFAULT_OUT_DIR = "dist";

export async function compilePage(inputHtml: string, options: CompilePageOptions = {}): Promise<string> {
  const sourcePath = path.resolve(inputHtml);
  await assertExists(sourcePath, `Input HTML file not found at '${inputHtml}'.`);

  const manifestPath = await resolveManifestPath(sourcePath, options.manifest);
  const manifestDir = path.dirname(manifestPath);
  const manifest = await loadManifest(manifestPath);

  const rawHtml = await fs.readFile(sourcePath, "utf8");
  const doctypeMatch = rawHtml.match(/^(<!doctype[^>]*>\s*)/i);
  const doctype = doctypeMatch?.[1] ?? "";
  const dom = loadHtml(rawHtml, { decodeEntities: false });

  const targets = dom("[data-snippet]").toArray();
  for (const node of targets) {
    const element = dom(node);
    const slug = element.attr("data-snippet");
    if (!slug) {
      continue;
    }
    const entry = manifest.find((item) => item.slug === slug);
    if (!entry) {
      console.warn(`mark↓: no snippet found for "${slug}"`);
      continue;
    }

    const snippetPath = path.resolve(manifestDir, entry.path);
    let raw: string;
    try {
      raw = await fs.readFile(snippetPath, "utf8");
    } catch (error) {
      console.warn(`mark↓: failed to read snippet at '${entry.path}'`, error);
      continue;
    }

    let body = raw;
    let frontMatterSlug: string | undefined;
    try {
      const frontMatter = parseFrontMatter(raw);
      body = frontMatter.content;
      frontMatterSlug = frontMatter.slug;
    } catch (error) {
      console.warn(`mark↓: failed to parse front matter for '${entry.path}'`, error);
    }

    const html = renderMarkdown(body);
    element.html(html);

    if (!element.attr("id")) {
      element.attr("id", frontMatterSlug ?? `snippet-${slug}`);
    }
  }

  const outputDir = options.inPlace ? path.dirname(sourcePath) : path.resolve(options.outDir ?? DEFAULT_OUT_DIR);
  if (!options.inPlace) {
    await fs.mkdir(outputDir, { recursive: true });
  }
  const outputPath = options.inPlace
    ? sourcePath
    : path.join(outputDir, path.basename(sourcePath));

  const outputHtml = `${doctype}${dom.html() ?? ""}`;
  await fs.writeFile(outputPath, outputHtml);

  logEvent("info", "compile_page.written", { outputPath });
  return outputPath;
}

async function resolveManifestPath(inputHtml: string, manifestFlag?: string): Promise<string> {
  const manifestPath = manifestFlag
    ? path.resolve(manifestFlag)
    : path.join(path.dirname(path.resolve(inputHtml)), "snippets-index.json");
  await assertExists(manifestPath, `Manifest file not found at '${manifestPath}'.`);
  return manifestPath;
}

async function loadManifest(manifestPath: string): Promise<SnippetMeta[]> {
  let raw: string;
  try {
    raw = await fs.readFile(manifestPath, "utf8");
  } catch (error) {
    throw new Error(`Failed to read manifest at '${manifestPath}': ${String(error)}`);
  }

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      throw new Error("Manifest must be a JSON array.");
    }
    return parsed as SnippetMeta[];
  } catch (error) {
    throw new Error(`Failed to parse manifest at '${manifestPath}': ${String(error)}`);
  }
}

async function assertExists(target: string, message: string) {
  try {
    await fs.access(target);
  } catch {
    throw new Error(message);
  }
}
