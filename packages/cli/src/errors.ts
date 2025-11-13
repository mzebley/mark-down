export class DuplicateSlugError extends Error {
  readonly duplicates: string[];

  constructor(duplicates: string[]) {
    super(`Duplicate slugs detected: ${duplicates.join(", ")}`);
    this.name = "DuplicateSlugError";
    this.duplicates = duplicates;
  }
}
