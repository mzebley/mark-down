import { parseFrontMatter, type FrontMatterResult } from "./front-matter";
import { renderMarkdown } from "./markdown";
import { sanitizeMarkup, type SanitizeOptions } from "./sanitize";

export interface InlineMarkdownOptions {
  selector?: string;
  processFrontMatter?: boolean;
  applyMetaToDom?: boolean;
  sanitize?: SanitizeOptions;
}

const DEFAULT_SELECTOR = "[data-markdown]";

export function enhanceInlineMarkdown(
  options: InlineMarkdownOptions = {},
): void {
  if (typeof document === "undefined") {
    return;
  }

  const selector = options.selector ?? DEFAULT_SELECTOR;
  const processFrontMatter = options.processFrontMatter !== false;
  const applyMetaToDom = options.applyMetaToDom !== false;
  const sanitize = options.sanitize;

  let elements: HTMLElement[] = [];
  try {
    elements = Array.from(document.querySelectorAll<HTMLElement>(selector));
  } catch (error) {
    console.warn("[mark↓ inline] Invalid selector provided:", error);
    return;
  }
  for (const element of elements) {
    if (element.dataset.markdownProcessed === "true") {
      continue;
    }
    processElement(element, { processFrontMatter, applyMetaToDom, sanitize });
  }
}

function processElement(
  element: HTMLElement,
  options: {
    processFrontMatter: boolean;
    applyMetaToDom: boolean;
    sanitize?: SanitizeOptions;
  },
): void {
  const raw = element.textContent ?? "";
  let frontMatter: FrontMatterResult | undefined;

  if (options.processFrontMatter) {
    try {
      frontMatter = parseFrontMatter(raw);
    } catch (error) {
      console.warn(
        "[mark↓ inline] Failed to parse front matter for element:",
        error,
      );
      frontMatter = undefined;
    }
  }

  const body = frontMatter?.content ?? raw;
  let html = renderMarkdown(body);
  if (options.sanitize) {
    html = sanitizeMarkup(html, options.sanitize);
  }

  element.innerHTML = html;
  element.dataset.markdownProcessed = "true";

  if (options.applyMetaToDom && frontMatter?.hasFrontMatter) {
    applyMetaAttributes(element, frontMatter);
  }
}

function applyMetaAttributes(
  element: HTMLElement,
  frontMatter: FrontMatterResult,
): void {
  const { slug, meta, extra } = frontMatter;

  if (slug) {
    if (!element.id) {
      element.id = slug;
    }
    element.dataset.slug = slug;
  }

  if (meta.title) {
    element.dataset.title = meta.title;
  }

  if (meta.tags?.length) {
    element.dataset.tags = meta.tags.join(",");
  }

  const variant = typeof extra.variant === "string" ? extra.variant.trim() : "";
  if (variant) {
    element.classList.add(`md-block--${variant}`);
  }
}
