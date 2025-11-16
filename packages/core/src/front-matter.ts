import { parse as parseYaml } from "yaml";
import { ManifestLoadError } from "./errors";
import type { SnippetMeta } from "./types";

export interface FrontMatterResult {
  content: string;
  meta: Partial<SnippetMeta>;
  extra: Record<string, unknown>;
  slug?: string;
  hasFrontMatter: boolean;
}

const FRONT_MATTER_PATTERN = /^(?:\uFEFF)?[ \t\r\n]*---\s*\r?\n([\s\S]*?)\r?\n---\s*\r?\n?/;

export function parseFrontMatter(raw: string): FrontMatterResult {
  const match = FRONT_MATTER_PATTERN.exec(raw);
  if (!match) {
    return { content: raw, meta: {}, extra: {}, hasFrontMatter: false };
  }

  const yamlSection = match[1];
  let data: unknown;
  try {
    data = parseYaml(yamlSection) ?? {};
  } catch (error) {
    throw new ManifestLoadError("Failed to parse snippet front-matter.", error);
  }

  if (!isRecord(data)) {
    return { content: raw.slice(match[0].length), meta: {}, extra: {}, hasFrontMatter: true };
  }

  const { known, extra } = splitFrontMatter(data);

  return {
    content: raw.slice(match[0].length),
    meta: known.meta,
    extra,
    slug: known.slug,
    hasFrontMatter: true
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

function isRecord(candidate: unknown): candidate is Record<string, unknown> {
  return Boolean(candidate) && typeof candidate === "object" && !Array.isArray(candidate);
}
