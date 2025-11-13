import matter from "gray-matter";
import { marked } from "marked";
import type {
  ListOptions,
  ManifestSource,
  ResponseLike,
  Snippet,
  SnippetClientOptions,
  SnippetFilter,
  SnippetMeta
} from "./types";

const OPTIONAL_FIELDS: Array<keyof SnippetMeta> = [
  "title",
  "order",
  "type",
  "tags",
  "draft"
];

export class SnippetClient {
  private readonly manifestSource: ManifestSource;
  private readonly fetcher: (input: string) => Promise<ResponseLike>;
  private readonly markdownRenderer: (markdown: string) => Promise<string> | string;
  private readonly resolveSnippetPath: (meta: SnippetMeta) => string;
  private manifestPromise?: Promise<SnippetMeta[]>;
  private snippetCache = new Map<string, Promise<Snippet>>();

  constructor(options: SnippetClientOptions) {
    this.manifestSource = options.manifest;
    this.fetcher = options.fetcher ?? defaultFetch;
    this.markdownRenderer = options.markdownRenderer ?? marked.parse;
    this.resolveSnippetPath = options.resolveSnippetPath ?? ((meta) => meta.path);
  }

  async get(slug: string): Promise<Snippet | undefined> {
    const manifest = await this.loadManifest();
    const entry = manifest.find((snippet) => snippet.slug === slug);
    if (!entry) {
      return undefined;
    }

    return this.loadSnippet(entry);
  }

  async list(filter?: SnippetFilter | ListOptions, options?: ListOptions): Promise<SnippetMeta[]> {
    const manifest = await this.loadManifest();
    let predicate: SnippetFilter | undefined;
    let finalOptions: ListOptions = {};

    if (typeof filter === "function") {
      predicate = filter;
      finalOptions = options ?? {};
    } else if (filter) {
      finalOptions = filter;
    } else if (options) {
      finalOptions = options;
    }

    let items = manifest;
    const filters: SnippetFilter[] = [];
    if (predicate) {
      filters.push(predicate);
    }
    if (finalOptions.filter) {
      filters.push(finalOptions.filter);
    }
    if (filters.length) {
      items = items.filter((entry) => filters.every((fn) => fn(entry)));
    }

    const offset = finalOptions.offset ?? 0;
    const limit = finalOptions.limit;
    if (offset > 0) {
      items = items.slice(offset);
    }
    if (typeof limit === "number") {
      items = items.slice(0, limit);
    }

    return [...items];
  }

  listByType(type: string, options?: ListOptions): Promise<SnippetMeta[]> {
    return this.list((entry) => entry.type === type, options);
  }

  listByGroup(group: string, options?: ListOptions): Promise<SnippetMeta[]> {
    return this.list((entry) => entry.group === group, options);
  }

  private loadSnippet(meta: SnippetMeta): Promise<Snippet> {
    const cached = this.snippetCache.get(meta.slug);
    if (cached) {
      return cached;
    }

    const promise = this.fetchSnippet(meta);
    this.snippetCache.set(meta.slug, promise);
    return promise;
  }

  private async fetchSnippet(meta: SnippetMeta): Promise<Snippet> {
    const snippetPath = this.resolveSnippetPath(meta);
    const response = await this.fetcher(snippetPath);
    if (!response.ok) {
      throw new Error(`Failed to fetch snippet '${meta.slug}' (status ${response.status})`);
    }

    const rawContent = await response.text();
    const parsed = matter(rawContent);
    const frontMatter = sanitizeFrontMatter(parsed.data ?? {});
    const mergedMeta = mergeFrontMatter(meta, frontMatter.meta);

    const html = await this.markdownRenderer(parsed.content);

    const baseExtra = mergedMeta.extra ?? {};
    return {
      ...mergedMeta,
      extra: {
        ...baseExtra,
        ...frontMatter.extra
      },
      markdown: parsed.content,
      html
    };
  }

  private loadManifest(): Promise<SnippetMeta[]> {
    if (!this.manifestPromise) {
      this.manifestPromise = this.resolveManifest();
    }
    return this.manifestPromise;
  }

  private async resolveManifest(): Promise<SnippetMeta[]> {
    if (Array.isArray(this.manifestSource)) {
      return this.manifestSource;
    }

    if (typeof this.manifestSource === "function") {
      const result = await this.manifestSource();
      return Array.isArray(result) ? result : Promise.reject(new Error("Manifest function must return an array"));
    }

    const raw = await this.fetchText(this.manifestSource);
    const manifest = JSON.parse(raw);
    if (!Array.isArray(manifest)) {
      throw new Error("Manifest must be an array");
    }
    return manifest;
  }

  private async fetchText(path: string): Promise<string> {
    const response = await this.fetcher(path);
    if (!response.ok) {
      throw new Error(`Failed to fetch manifest from ${path} (status ${response.status})`);
    }
    return response.text();
  }
}

function sanitizeFrontMatter(data: Record<string, unknown>) {
  const meta: Partial<SnippetMeta> = {};
  const extra: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(data)) {
    if (OPTIONAL_FIELDS.includes(key as keyof SnippetMeta)) {
      if (key === "tags") {
        meta.tags = normalizeTags(value);
      } else {
        (meta as Record<string, unknown>)[key] = value;
      }
    } else {
      extra[key] = value;
    }
  }

  return { meta, extra };
}

function normalizeTags(value: unknown): string[] | undefined {
  if (!value) {
    return undefined;
  }
  if (Array.isArray(value)) {
    return value.map((tag) => String(tag));
  }
  if (typeof value === "string") {
    return value
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);
  }
  return undefined;
}

function mergeFrontMatter(base: SnippetMeta, overrides: Partial<SnippetMeta>): SnippetMeta {
  const merged: SnippetMeta = { ...base };
  for (const field of OPTIONAL_FIELDS) {
    const overrideValue = overrides[field];
    if (overrideValue !== undefined && merged[field] === undefined) {
      merged[field] = overrideValue as never;
    }
  }
  return merged;
}

async function defaultFetch(input: string): Promise<ResponseLike> {
  const runtimeFetch = (globalThis as typeof globalThis & { fetch?: typeof fetch }).fetch;
  if (!runtimeFetch) {
    throw new Error("No global fetch implementation found. Provide a custom fetcher.");
  }
  return runtimeFetch(input);
}
