export interface SnippetMeta {
  slug: string;
  title?: string;
  type?: string;
  order?: number;
  tags?: string[];
  path: string;
  group?: string | null;
  draft?: boolean;
  extra?: Record<string, unknown>;
}

export interface Snippet extends SnippetMeta {
  html: string;
  raw?: string;
}

export interface SnippetSearchFilter {
  type?: string;
  group?: string;
  tags?: string[];
  tagsMode?: "any" | "all";
}

export type ManifestSource =
  | string
  | SnippetMeta[]
  | (() => Promise<SnippetMeta[]> | SnippetMeta[]);

export interface ResponseLike {
  ok: boolean;
  status: number;
  text(): Promise<string>;
}

export type SnippetFetcherResult = string | ResponseLike;

export type SnippetFetcher = (url: string) => Promise<SnippetFetcherResult>;

export interface SnippetClientOptions {
  manifest: ManifestSource;
  base?: string;
  fetch?: SnippetFetcher;
  frontMatter?: boolean;
  cache?: boolean;
  verbose?: boolean;
  render?: (markdown: string) => string | Promise<string>;
}
