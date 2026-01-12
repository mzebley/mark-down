import sanitizeHtml, { type IOptions } from "sanitize-html";

export type SanitizePolicy = "default" | "strict" | "permissive";

export interface SanitizeOptions {
  policy?: SanitizePolicy;
  config?: IOptions;
}

const DEFAULT_ALLOWED_TAGS = [
  "a",
  "b",
  "blockquote",
  "br",
  "code",
  "del",
  "em",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "hr",
  "i",
  "img",
  "li",
  "ol",
  "p",
  "pre",
  "span",
  "strong",
  "sub",
  "sup",
  "table",
  "tbody",
  "td",
  "th",
  "thead",
  "tr",
  "ul",
];

const STRICT_ALLOWED_TAGS = [
  "a",
  "blockquote",
  "br",
  "code",
  "em",
  "li",
  "ol",
  "p",
  "pre",
  "strong",
  "ul",
];

const DEFAULT_ALLOWED_ATTRIBUTES: IOptions["allowedAttributes"] = {
  a: ["href", "name", "target", "rel"],
  img: ["src", "alt", "title", "width", "height"],
  code: ["class"],
  pre: ["class"],
  span: ["class"],
  "*": ["id", "title", "aria-*", "data-*"],
};

const STRICT_ALLOWED_ATTRIBUTES: IOptions["allowedAttributes"] = {
  a: ["href", "name", "target", "rel"],
};

const POLICY_CONFIG: Record<SanitizePolicy, IOptions> = {
  default: {
    allowedTags: DEFAULT_ALLOWED_TAGS,
    allowedAttributes: DEFAULT_ALLOWED_ATTRIBUTES,
    allowedSchemes: ["http", "https", "mailto"],
    allowedSchemesByTag: {
      img: ["http", "https", "data"],
    },
  },
  strict: {
    allowedTags: STRICT_ALLOWED_TAGS,
    allowedAttributes: STRICT_ALLOWED_ATTRIBUTES,
    allowedSchemes: ["http", "https", "mailto"],
  },
  permissive: {
    ...sanitizeHtml.defaults,
    allowedTags: sanitizeHtml.defaults.allowedTags
      ? [...sanitizeHtml.defaults.allowedTags]
      : undefined,
    allowedAttributes: sanitizeHtml.defaults.allowedAttributes
      ? { ...sanitizeHtml.defaults.allowedAttributes }
      : undefined,
  },
};

export function sanitizeMarkup(
  html: string,
  options: SanitizeOptions = {},
): string {
  const policy = options.policy ?? "default";
  const base = POLICY_CONFIG[policy];
  const merged = mergeOptions(base, options.config);
  return sanitizeHtml(html, merged);
}

function mergeOptions(base: IOptions, overrides?: IOptions): IOptions {
  if (!overrides) {
    return base;
  }
  return {
    ...base,
    ...overrides,
    allowedAttributes: mergeAllowedAttributes(
      base.allowedAttributes,
      overrides.allowedAttributes,
    ),
    allowedClasses: mergeRecord(base.allowedClasses, overrides.allowedClasses),
    allowedStyles: mergeRecord(base.allowedStyles, overrides.allowedStyles),
  };
}

function mergeAllowedAttributes(
  base?: IOptions["allowedAttributes"],
  overrides?: IOptions["allowedAttributes"],
): IOptions["allowedAttributes"] {
  if (overrides === false) {
    return false;
  }
  if (base === false) {
    return overrides ?? false;
  }
  if (!base && !overrides) {
    return undefined;
  }
  return { ...(base ?? {}), ...(overrides ?? {}) };
}

function mergeRecord<T extends Record<string, unknown>>(
  base?: T,
  overrides?: T,
): T | undefined {
  if (!base && !overrides) {
    return undefined;
  }
  return { ...(base ?? {}), ...(overrides ?? {}) } as T;
}
