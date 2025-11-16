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
