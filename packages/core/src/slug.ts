const NON_ALPHANUMERIC = /[^a-z0-9]+/gi;
const LEADING_TRAILING_DASH = /^-+|-+$/g;

export function normalizeSlug(input: string): string {
  const value = input?.trim();
  if (!value) {
    throw new Error("Cannot normalize an empty slug");
  }

  const normalized = value
    .toLowerCase()
    .replace(NON_ALPHANUMERIC, "-")
    .replace(/-{2,}/g, "-")
    .replace(LEADING_TRAILING_DASH, "");

  if (!normalized) {
    throw new Error(`Slug '${input}' does not contain any alphanumeric characters`);
  }

  return normalized;
}
