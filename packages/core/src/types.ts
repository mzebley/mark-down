export interface SnippetMeta {
  slug: string;
  title?: string;
  order?: number | null;
  type?: string;
  tags?: string[];
  draft?: boolean;
  path: string;
  group: string;
  extra?: Record<string, unknown>;
}

export interface Snippet extends SnippetMeta {
  markdown: string;
  html: string;
}

export type SnippetFilter = (snippet: SnippetMeta) => boolean;

export interface ListOptions {
  filter?: SnippetFilter;
  limit?: number;
  offset?: number;
}

export type ManifestSource =
  | string
  | SnippetMeta[]
  | (() => Promise<SnippetMeta[]> | SnippetMeta[]);

export interface SnippetClientOptions {
  /** Where to load the manifest; defaults to `/snippets-index.json`. */
  manifest: ManifestSource;
  /** Custom fetch to use in Node environments. Falls back to global `fetch`. */
  fetcher?: (input: string) => Promise<ResponseLike>;
  /** Allows overriding markdown → HTML rendering. Defaults to `marked`. */
  markdownRenderer?: (markdown: string) => Promise<string> | string;
  /** Customize how snippet URLs are resolved; defaults to the manifest `path`. */
  resolveSnippetPath?: (meta: SnippetMeta) => string;
}

export interface ResponseLike {
  ok: boolean;
  status: number;
  text(): Promise<string>;
}
