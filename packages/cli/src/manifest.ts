import fs from "node:fs/promises";
import path from "node:path";
import fg from "fast-glob";
import matter from "gray-matter";
import YAML from "yaml";
import { normalizeSlug, type SnippetMeta } from "@mzebley/mark-down";
import { DuplicateSlugError } from "./errors.js";

const MATTER_OPTIONS = {
  engines: {
    yaml: (source: string) => YAML.parse(source) ?? {}
  }
};

export interface BuildOptions {
  sourceDir: string;
  outputPath?: string;
}

export interface BuildResult {
  manifest: SnippetMeta[];
  outputPath: string;
}

export async function buildManifestFile(options: BuildOptions): Promise<BuildResult> {
  const manifest = await buildManifest(options.sourceDir);
  const target = options.outputPath ?? path.join(options.sourceDir, "snippets-index.json");
  await fs.writeFile(target, JSON.stringify(manifest, null, 2));
  return { manifest, outputPath: target };
}

export async function buildManifest(sourceDir: string): Promise<SnippetMeta[]> {
  const cwd = path.resolve(sourceDir);
  const files = await fg(["**/*.md"], { cwd, absolute: true });
  const manifest: SnippetMeta[] = [];

  for (const absolutePath of files) {
    const relativePath = path.relative(cwd, absolutePath);
    const normalizedPath = toPosix(relativePath);
    const content = await fs.readFile(absolutePath, "utf8");
    const parsed = matter(content, MATTER_OPTIONS);
    const snippet = createSnippet(normalizedPath, parsed.data ?? {});
    if (snippet.draft) {
      continue;
    }
    manifest.push(snippet);
  }

  ensureUniqueSlugs(manifest);

  manifest.sort((a, b) => {
    const orderA = typeof a.order === "number" ? a.order : Number.POSITIVE_INFINITY;
    const orderB = typeof b.order === "number" ? b.order : Number.POSITIVE_INFINITY;
    if (orderA !== orderB) {
      return orderA - orderB;
    }
    const titleA = a.title?.toLowerCase() ?? "";
    const titleB = b.title?.toLowerCase() ?? "";
    return titleA.localeCompare(titleB);
  });

  return manifest;
}

export function createSnippet(relativePath: string, frontMatter: Record<string, unknown>): SnippetMeta {
  const group = deriveGroup(relativePath);
  const slugSource = typeof frontMatter.slug === "string" && frontMatter.slug.trim().length
    ? frontMatter.slug
    : relativePath.replace(/\.md$/i, "");
  const slug = normalizeSlug(slugSource);

  const { title, order, type, tags, draft } = normalizeKnownFields(frontMatter);
  const extra = collectExtra(frontMatter);

  return {
    slug,
    title,
    order,
    type,
    tags,
    draft,
    path: relativePath,
    group,
    extra
  };
}

function normalizeKnownFields(data: Record<string, unknown>) {
  return {
    title: typeof data.title === "string" ? data.title : undefined,
    order: typeof data.order === "number"
      ? data.order
      : data.order === null
        ? null
        : undefined,
    type: typeof data.type === "string" ? data.type : undefined,
    tags: normalizeTags(data.tags),
    draft: data.draft === true ? true : undefined
  };
}

function collectExtra(data: Record<string, unknown>): Record<string, unknown> | undefined {
  const extra: Record<string, unknown> = {};
  const reserved = new Set(["slug", "title", "order", "type", "tags", "draft"]);
  for (const [key, value] of Object.entries(data)) {
    if (reserved.has(key)) {
      continue;
    }
    extra[key] = value;
  }
  return Object.keys(extra).length ? extra : undefined;
}

function normalizeTags(value: unknown): string[] | undefined {
  if (!value) {
    return undefined;
  }
  if (Array.isArray(value)) {
    return value.map((entry) => String(entry));
  }
  if (typeof value === "string") {
    return value
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean);
  }
  return undefined;
}

function deriveGroup(relativePath: string): string {
  const dirname = toPosix(path.dirname(relativePath));
  if (dirname === "." || !dirname.length) {
    return "root";
  }
  return dirname;
}

function toPosix(value: string): string {
  return value.split(path.sep).join("/");
}

function ensureUniqueSlugs(manifest: SnippetMeta[]) {
  const seen = new Map<string, string>();
  const duplicates = new Set<string>();
  for (const snippet of manifest) {
    if (seen.has(snippet.slug)) {
      duplicates.add(snippet.slug);
    } else {
      seen.set(snippet.slug, snippet.path);
    }
  }
  if (duplicates.size) {
    throw new DuplicateSlugError([...duplicates.values()]);
  }
}
