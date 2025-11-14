import { marked } from "marked";
import { parse as parseYaml } from "yaml";
import { normalizeSlug } from "./slug";
import type {
  ManifestSource,
  ResponseLike,
  Snippet,
  SnippetClientOptions,
  SnippetFetcherResult,
  SnippetMeta,
  SnippetSearchFilter
} from "./types";

export class SnippetNotFoundError extends Error {
  readonly slug: string;

  constructor(slug: string) {
    super(`Snippet with slug '${slug}' was not found in the manifest.`);
    this.name = "SnippetNotFoundError";
    this.slug = slug;
  }
}

export class ManifestLoadError extends Error {
  readonly cause?: unknown;

  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = "ManifestLoadError";
    this.cause = cause instanceof Error ? cause : cause ? new Error(String(cause)) : undefined;
  }
}

interface FrontMatterResult {
  content: string;
  meta: Partial<SnippetMeta>;
  extra: Record<string, unknown>;
  slug?: string;
}

interface SnippetClientInternalOptions {
  manifest: ManifestSource;
  base?: string;
  fetch: (url: string) => Promise<string>;
  frontMatter: boolean;
  cache: boolean;
  verbose: boolean;
  render: (markdown: string) => Promise<string>;
}

const FRONT_MATTER_PATTERN = /^---\s*\n([\s\S]*?)\n---\s*\n?/;
const HTTP_PATTERN = /^https?:\/\//i;

export class SnippetClient {
  private readonly options: SnippetClientInternalOptions;
  private readonly manifestUrl?: string;
  private readonly inferredBase?: string;

  private manifestPromise?: Promise<SnippetMeta[]>;
  private readonly snippetCache = new Map<string, Promise<Snippet>>();

  constructor(options: SnippetClientOptions) {
    if (!options || !options.manifest) {
      throw new ManifestLoadError("A manifest source must be provided to SnippetClient.");
    }

    this.manifestUrl = typeof options.manifest === "string" ? options.manifest : undefined;
    this.inferredBase = this.manifestUrl ? deriveBaseFromManifest(this.manifestUrl) : undefined;

    const fetcher = options.fetch ?? defaultFetch;

    const renderOption = options.render;

    const renderer = renderOption
      ? async (markdown: string) => Promise.resolve(renderOption(markdown))
      : async (markdown: string) => Promise.resolve(marked.parse(markdown));

    this.options = {
      manifest: options.manifest,
      base: options.base,
      fetch: async (url: string) => {
        const response = await fetcher(url);
        if (typeof response === "string") {
          return response;
        }
        return resolveResponseText(response, url);
      },
      frontMatter: options.frontMatter !== false,
      cache: options.cache !== false,
      verbose: options.verbose === true,
      render: renderer
    };
  }

  async get(slug: string): Promise<Snippet> {
    const manifest = await this.loadManifest();
    const entry = manifest.find((item) => item.slug === slug);
    if (!entry) {
      throw new SnippetNotFoundError(slug);
    }
    return this.loadSnippet(entry);
  }

  async listAll(): Promise<SnippetMeta[]> {
    const manifest = await this.loadManifest();
    return manifest.map(cloneMeta);
  }

  async listByGroup(group: string): Promise<SnippetMeta[]> {
    const manifest = await this.loadManifest();
    return manifest
      .filter((item) => (item.group ?? null) === group)
      .map(cloneMeta);
  }

  async listByType(type: string): Promise<SnippetMeta[]> {
    const manifest = await this.loadManifest();
    return manifest
      .filter((item) => item.type === type)
      .map(cloneMeta);
  }

  async search(filter: SnippetSearchFilter): Promise<SnippetMeta[]> {
    const manifest = await this.loadManifest();
    const tags = filter.tags ?? [];
    const mode = filter.tagsMode ?? "any";

    return manifest
      .filter((item) => {
        if (filter.type && item.type !== filter.type) {
          return false;
        }
        if (filter.group && (item.group ?? undefined) !== filter.group) {
          return false;
        }
        if (!tags.length) {
          return true;
        }
        const metaTags = item.tags ?? [];
        if (!metaTags.length) {
          return false;
        }
        if (mode === "all") {
          return tags.every((tag) => metaTags.includes(tag));
        }
        return tags.some((tag) => metaTags.includes(tag));
      })
      .map(cloneMeta);
  }

  async getHtml(slug: string): Promise<string> {
    const snippet = await this.get(slug);
    return snippet.html;
  }

  invalidate(): void {
    this.manifestPromise = undefined;
    this.snippetCache.clear();
  }

  invalidateSlug(slug: string): void {
    this.snippetCache.delete(slug);
  }

  private async loadManifest(): Promise<SnippetMeta[]> {
    if (this.options.cache && this.manifestPromise) {
      return this.manifestPromise;
    }

    const promise = this.resolveManifest();
    if (this.options.cache) {
      this.manifestPromise = promise;
    }
    return promise;
  }

  private async resolveManifest(): Promise<SnippetMeta[]> {
    const source = this.options.manifest;
    let entries: SnippetMeta[];

    try {
      if (Array.isArray(source)) {
        entries = source.map(normalizeManifestEntry);
      } else if (typeof source === "function") {
        const result = await source();
        if (!Array.isArray(result)) {
          throw new ManifestLoadError("Manifest loader must resolve to an array of snippet metadata.");
        }
        entries = result.map(normalizeManifestEntry);
      } else {
        const raw = await this.options.fetch(source);
        entries = parseManifest(raw, source).map(normalizeManifestEntry);
      }
    } catch (error) {
      if (error instanceof ManifestLoadError) {
        throw error;
      }
      throw new ManifestLoadError("Failed to load snippet manifest.", error);
    }

    return entries.map(cloneMeta);
  }

  private loadSnippet(meta: SnippetMeta): Promise<Snippet> {
    const cached = this.options.cache ? this.snippetCache.get(meta.slug) : undefined;
    if (cached) {
      return cached;
    }
    const promise = this.fetchSnippet(meta);
    if (this.options.cache) {
      this.snippetCache.set(meta.slug, promise);
    }
    return promise;
  }

  private async fetchSnippet(meta: SnippetMeta): Promise<Snippet> {
    const url = this.resolveSnippetPath(meta.path);
    let raw: string;
    try {
      raw = await this.options.fetch(url);
    } catch (error) {
      throw new ManifestLoadError(`Failed to fetch snippet at '${url}'.`, error);
    }

    const frontMatter = this.options.frontMatter ? parseFrontMatter(raw) : undefined;
    const body = frontMatter?.content ?? raw;
    const html = await this.options.render(body);

    const merged: SnippetMeta = {
      ...meta,
      ...pickMeta(frontMatter?.meta),
      extra: mergeExtra(meta.extra, frontMatter?.extra)
    };

    if (frontMatter?.slug) {
      try {
        const normalizedFrontSlug = normalizeSlug(frontMatter.slug);
        if (normalizedFrontSlug !== meta.slug && this.options.verbose) {
          console.warn(
            `Front-matter slug '${frontMatter.slug}' (normalized: '${normalizedFrontSlug}') differs from manifest slug '${meta.slug}'.`
          );
        }
      } catch (error) {
        if (this.options.verbose) {
          console.warn(`Failed to normalize front-matter slug '${frontMatter.slug}':`, error);
        }
      }
    }

    const snippet: Snippet = { ...merged, html, raw: body };
    if (merged.tags) {
      snippet.tags = [...merged.tags];
    }
    return snippet;
  }

  private resolveSnippetPath(path: string): string {
    if (HTTP_PATTERN.test(path) || path.startsWith("/")) {
      return normalizeForwardSlashes(path);
    }

    const base = this.options.base ?? this.inferredBase ?? "";
    if (base) {
      return joinPaths(base, path);
    }
    return normalizeForwardSlashes(path);
  }
}

function parseManifest(raw: string, source: string): SnippetMeta[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new ManifestLoadError(`Manifest at '${source}' is not valid JSON.`, error);
  }

  if (!Array.isArray(parsed)) {
    throw new ManifestLoadError(`Manifest at '${source}' must be a JSON array.`);
  }

  return parsed as SnippetMeta[];
}

function normalizeManifestEntry(entry: SnippetMeta): SnippetMeta {
  if (!entry.slug) {
    throw new ManifestLoadError("Manifest entry is missing required 'slug' property.");
  }
  if (!entry.path) {
    throw new ManifestLoadError(`Manifest entry for '${entry.slug}' is missing required 'path'.`);
  }
  const normalized: SnippetMeta = {
    slug: entry.slug,
    title: entry.title,
    type: entry.type,
    order: entry.order,
    tags: entry.tags ? [...entry.tags] : undefined,
    path: normalizeForwardSlashes(entry.path),
    group: entry.group ?? null,
    draft: entry.draft,
    extra: cloneRecord(entry.extra)
  };
  return normalized;
}

function parseFrontMatter(raw: string): FrontMatterResult {
  const match = FRONT_MATTER_PATTERN.exec(raw);
  if (!match) {
    return { content: raw, meta: {}, extra: {} };
  }

  const yamlSection = match[1];
  let data: unknown;
  try {
    data = parseYaml(yamlSection) ?? {};
  } catch (error) {
    throw new ManifestLoadError("Failed to parse snippet front-matter.", error);
  }

  if (!isRecord(data)) {
    return { content: raw.slice(match[0].length), meta: {}, extra: {} };
  }

  const { known, extra } = splitFrontMatter(data);

  return {
    content: raw.slice(match[0].length),
    meta: known.meta,
    extra,
    slug: known.slug
  };
}

function splitFrontMatter(
  data: Record<string, unknown>
): { known: { meta: Partial<SnippetMeta>; slug?: string }; extra: Record<string, unknown> } {
  const meta: Partial<SnippetMeta> = {};
  const extra: Record<string, unknown> = {};
  let slug: string | undefined;

  for (const [key, value] of Object.entries(data)) {
    switch (key) {
      case "slug":
        slug = typeof value === "string" ? value : undefined;
        break;
      case "title":
        if (typeof value === "string") {
          meta.title = value;
        }
        break;
      case "type":
        if (typeof value === "string") {
          meta.type = value;
        }
        break;
      case "order":
        if (typeof value === "number") {
          meta.order = value;
        }
        break;
      case "tags":
        meta.tags = normalizeTags(value);
        break;
      case "group":
        if (typeof value === "string" || value === null) {
          meta.group = value;
        }
        break;
      case "draft":
        if (typeof value === "boolean") {
          meta.draft = value;
        }
        break;
      default:
        extra[key] = value;
        break;
    }
  }

  return { known: { meta, slug }, extra };
}

function normalizeTags(value: unknown): string[] | undefined {
  if (!value) {
    return undefined;
  }
  if (Array.isArray(value)) {
    return value.map((item) => String(item));
  }
  if (typeof value === "string") {
    return value
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);
  }
  return undefined;
}

function deriveBaseFromManifest(manifest: string): string | undefined {
  if (HTTP_PATTERN.test(manifest)) {
    try {
      const url = new URL(manifest);
      url.hash = "";
      url.search = "";
      const path = url.pathname;
      url.pathname = path.replace(/[^/]*$/, "");
      return url.toString();
    } catch (error) {
      console.warn(`Unable to derive base from manifest '${manifest}':`, error);
      return undefined;
    }
  }

  const sanitized = manifest.replace(/[?#].*$/, "");
  const index = sanitized.lastIndexOf("/");
  if (index === -1) {
    return undefined;
  }
  return sanitized.slice(0, index + 1);
}

function joinPaths(base: string, relative: string): string {
  if (HTTP_PATTERN.test(base)) {
    return new URL(relative, base).toString();
  }
  const leading = base.endsWith("/") ? base : `${base}/`;
  const trimmed = relative.startsWith("/") ? relative.slice(1) : relative;
  return normalizeForwardSlashes(`${leading}${trimmed}`);
}

function normalizeForwardSlashes(value: string): string {
  if (HTTP_PATTERN.test(value)) {
    try {
      const url = new URL(value);
      url.pathname = url.pathname.replace(/\/{2,}/g, "/");
      return url.toString();
    } catch {
      // fall back to manual normalization below
    }
  }

  if (value.startsWith("//")) {
    return `//${value.slice(2).replace(/\/{2,}/g, "/")}`;
  }

  if (value.startsWith("/")) {
    return `/${value
      .slice(1)
      .replace(/\/{2,}/g, "/")}`;
  }

  return value.replace(/\/{2,}/g, "/");
}

function mergeExtra(
  base: Record<string, unknown> | undefined,
  overrides: Record<string, unknown> | undefined
): Record<string, unknown> | undefined {
  if (!base && !overrides) {
    return undefined;
  }
  return { ...(base ?? {}), ...(overrides ?? {}) };
}

function cloneRecord<T extends Record<string, unknown> | undefined>(value: T): T {
  if (!value) {
    return value;
  }
  return { ...value } as T;
}

function cloneMeta(meta: SnippetMeta): SnippetMeta {
  return {
    ...meta,
    tags: meta.tags ? [...meta.tags] : undefined,
    extra: cloneRecord(meta.extra)
  };
}

function isRecord(candidate: unknown): candidate is Record<string, unknown> {
  return Boolean(candidate) && typeof candidate === "object" && !Array.isArray(candidate);
}

async function defaultFetch(url: string): Promise<SnippetFetcherResult> {
  const runtimeFetch = (globalThis as typeof globalThis & { fetch?: typeof fetch }).fetch;
  if (!runtimeFetch) {
    throw new ManifestLoadError("No global fetch implementation is available. Provide a custom fetch function.");
  }
  return runtimeFetch(url);
}

async function resolveResponseText(response: ResponseLike, url: string): Promise<string> {
  if (!response.ok) {
    throw new ManifestLoadError(`Request to '${url}' failed with status ${response.status}.`);
  }
  return response.text();
}

function pickMeta(meta?: Partial<SnippetMeta>): Partial<SnippetMeta> {
  if (!meta) {
    return {};
  }
  const result: Partial<SnippetMeta> = {};
  if (meta.title !== undefined) {
    result.title = meta.title;
  }
  if (meta.type !== undefined) {
    result.type = meta.type;
  }
  if (meta.order !== undefined) {
    result.order = meta.order;
  }
  if (meta.tags !== undefined) {
    result.tags = [...meta.tags];
  }
  if (meta.group !== undefined) {
    result.group = meta.group;
  }
  if (meta.draft !== undefined) {
    result.draft = meta.draft;
  }
  if (meta.path !== undefined) {
    result.path = meta.path;
  }
  return result;
}
