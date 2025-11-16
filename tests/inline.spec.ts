import { afterEach, describe, expect, it, vi } from "vitest";
import { enhanceInlineMarkdown } from "../packages/core/src/inline";

type InlineTestElement = HTMLElement & {
  __classes: Set<string>;
  dataset: DOMStringMap & Record<string, string>;
  textContent: string | null;
  innerHTML: string;
  id: string;
};

const originalDocument = globalThis.document;

describe("enhanceInlineMarkdown", () => {
  afterEach(() => {
    if (originalDocument) {
      (globalThis as typeof globalThis & { document: Document }).document = originalDocument;
    } else {
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete (globalThis as typeof globalThis & { document?: Document }).document;
    }
  });

  it("renders inline markdown blocks and marks them as processed", () => {
    const element = createElement("# Hello\n\nThis is inline markdown.");
    stubDocument([element]);

    enhanceInlineMarkdown();

    expect(element.innerHTML).toContain("<h1>Hello</h1>");
    expect(element.dataset.markdownProcessed).toBe("true");
  });

  it("applies front matter metadata to the DOM", () => {
    const element = createElement(`---
slug: intro
title: Introduction
tags: [hero, docs]
variant: lead
---

# Introduction`);
    stubDocument([element]);

    enhanceInlineMarkdown();

    expect(element.id).toBe("intro");
    expect(element.dataset.slug).toBe("intro");
    expect(element.dataset.title).toBe("Introduction");
    expect(element.dataset.tags).toBe("hero,docs");
    expect(element.__classes.has("md-block--lead")).toBe(true);
    expect(element.innerHTML).toContain("<h1>Introduction</h1>");
  });

  it("skips metadata application when disabled", () => {
    const element = createElement(`---
slug: hero
title: Hero
---

**hello**`);
    stubDocument([element]);

    enhanceInlineMarkdown({ applyMetaToDom: false });

    expect(element.dataset.slug).toBeUndefined();
    expect(element.dataset.title).toBeUndefined();
    expect(element.id).toBe("");
  });

  it("can skip front matter parsing entirely", () => {
    const element = createElement(`---
slug: hero
---

**hello**`);
    stubDocument([element]);

    enhanceInlineMarkdown({ processFrontMatter: false });

    expect(element.dataset.slug).toBeUndefined();
    expect(element.innerHTML).toContain("slug: hero");
  });

  it("does not reprocess elements that were already handled", () => {
    const element = createElement("# Heading");
    stubDocument([element]);

    enhanceInlineMarkdown();
    const firstHtml = element.innerHTML;

    enhanceInlineMarkdown();

    expect(element.innerHTML).toBe(firstHtml);
    expect(element.dataset.markdownProcessed).toBe("true");
  });

  it("logs a warning when front matter parsing fails but still renders markdown", () => {
    const element = createElement(`---
title: ["unterminated
---

Content`);
    stubDocument([element]);
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    enhanceInlineMarkdown();

    expect(warnSpy).toHaveBeenCalled();
    expect(element.innerHTML).toContain("title: [");
    warnSpy.mockRestore();
  });
});

function createElement(markdown: string): InlineTestElement {
  const dataset: Record<string, string> = {};
  const classes = new Set<string>();
  const element = {
    dataset: dataset as DOMStringMap & Record<string, string>,
    textContent: markdown,
    innerHTML: "",
    id: "",
    classList: {
      add: (...tokens: string[]) => {
        for (const token of tokens) {
          if (token) {
            classes.add(token);
          }
        }
      }
    } as unknown as DOMTokenList,
    __classes: classes
  };

  return element as InlineTestElement;
}

function stubDocument(elements: InlineTestElement[], selector = "[data-markdown]"): void {
  const nodeList = elements as unknown as NodeListOf<HTMLElement>;
  const fakeDocument = {
    querySelectorAll: (query: string) => {
      if (query === selector) {
        return nodeList;
      }
      return [] as unknown as NodeListOf<HTMLElement>;
    }
  };

  (globalThis as typeof globalThis & { document: Document }).document = fakeDocument as Document;
}
