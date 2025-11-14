import { beforeEach, describe, expect, it, vi } from "vitest";
import { ManifestLoadError, SnippetClient, SnippetNotFoundError } from "../packages/core/src/snippet-client";
import type { SnippetMeta } from "../packages/core/src/types";

const BASE_MANIFEST: SnippetMeta[] = [
  {
    slug: "introduction",
    path: "guides/introduction.md",
    group: "guides",
    title: "Introduction"
  },
  {
    slug: "button",
    path: "components/button.md",
    group: "components",
    type: "component",
    tags: ["ui", "interactive"]
  }
];

describe("SnippetClient", () => {
  let fetchSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchSpy = vi.fn(async (url: string) => {
      if (url.endsWith("manifest.json")) {
        return JSON.stringify(BASE_MANIFEST);
      }
      if (url.endsWith("guides/introduction.md")) {
        return "---\ntitle: Intro Override\ntags:\n  - docs\n  - start\ncustom: true\n---\n# Hello";
      }
      if (url.endsWith("components/button.md")) {
        return "# Button";
      }
      throw new Error(`Unexpected fetch url ${url}`);
    });
  });

  it("loads manifest from url and resolves relative snippet paths using base option", async () => {
    const client = new SnippetClient({
      manifest: "/assets/snippets/manifest.json",
      base: "/assets/snippets/content",
      fetch: fetchSpy
    });

    const snippet = await client.get("introduction");
    expect(snippet.slug).toBe("introduction");
    expect(snippet.title).toBe("Intro Override");
    expect(snippet.tags).toEqual(["docs", "start"]);
    expect(snippet.extra).toMatchObject({ custom: true });
    expect(fetchSpy).toHaveBeenCalledWith("/assets/snippets/manifest.json");
    expect(fetchSpy).toHaveBeenCalledWith("/assets/snippets/content/guides/introduction.md");
  });

  it("warns when front matter slug differs and verbose enabled", async () => {
    const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    fetchSpy.mockResolvedValueOnce(JSON.stringify([
      {
        slug: "about",
        path: "company/about.md"
      }
    ]));
    fetchSpy.mockResolvedValueOnce("---\nslug: ABOUT-US\n---\nContent");

    const client = new SnippetClient({
      manifest: "https://cdn.example.com/manifest.json",
      fetch: fetchSpy,
      verbose: true
    });

    await client.get("about");
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("Front-matter slug 'ABOUT-US'")
    );
    consoleSpy.mockRestore();
  });

  it("infers base path from manifest url when base option absent", async () => {
    fetchSpy.mockResolvedValueOnce(
      JSON.stringify([
        {
          slug: "who-we-are",
          path: "company/who-we-are.md"
        }
      ])
    );
    fetchSpy.mockResolvedValueOnce("# Team");

    const client = new SnippetClient({
      manifest: "https://cdn.example.com/content/manifest.json",
      fetch: fetchSpy
    });

    await client.get("who-we-are");
    expect(fetchSpy).toHaveBeenLastCalledWith("https://cdn.example.com/content/company/who-we-are.md");
  });

  it("supports cache toggling and invalidation", async () => {
    const client = new SnippetClient({ manifest: BASE_MANIFEST, fetch: fetchSpy });
    await client.get("button");
    await client.get("button");
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    client.invalidateSlug("button");
    await client.get("button");
    expect(fetchSpy).toHaveBeenCalledTimes(2);

    client.invalidate();
    await client.listAll();
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it("bypasses caches when disabled", async () => {
    const client = new SnippetClient({
      manifest: BASE_MANIFEST,
      fetch: fetchSpy,
      cache: false
    });

    await client.get("button");
    await client.get("button");
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it("supports list helpers and search filters", async () => {
    const client = new SnippetClient({ manifest: BASE_MANIFEST, fetch: fetchSpy });

    const all = await client.listAll();
    expect(all).toHaveLength(2);

    const components = await client.listByGroup("components");
    expect(components).toHaveLength(1);
    expect(components[0].slug).toBe("button");

    const typeList = await client.listByType("component");
    expect(typeList).toHaveLength(1);

    const tagMatch = await client.search({ tags: ["ui"], tagsMode: "any" });
    expect(tagMatch).toHaveLength(1);

    const tagAll = await client.search({ tags: ["ui", "interactive"], tagsMode: "all" });
    expect(tagAll).toHaveLength(1);

    const noMatch = await client.search({ tags: ["ui", "docs"], tagsMode: "all" });
    expect(noMatch).toHaveLength(0);
  });

  it("throws SnippetNotFoundError for unknown slug", async () => {
    const client = new SnippetClient({ manifest: BASE_MANIFEST, fetch: fetchSpy });
    await expect(client.get("missing"))
      .rejects.toBeInstanceOf(SnippetNotFoundError);
  });

  it("throws ManifestLoadError when manifest entries are invalid", async () => {
    const client = new SnippetClient({
      manifest: [
        {
          // @ts-expect-error intentionally invalid
          path: "missing-slug.md"
        }
      ],
      fetch: fetchSpy
    });

    await expect(client.listAll()).rejects.toBeInstanceOf(ManifestLoadError);
  });

  it("returns raw markdown without front matter when disabled", async () => {
    const client = new SnippetClient({
      manifest: BASE_MANIFEST,
      fetch: async (url: string) => {
        if (url.includes("introduction")) {
          return "---\ntitle: Hidden\n---\n# Heading";
        }
        return fetchSpy(url);
      },
      frontMatter: false
    });

    const snippet = await client.get("introduction");
    expect(snippet.raw).toContain("title: Hidden");
    expect(snippet.title).toBe("Introduction");
  });

  it("respects a custom render function", async () => {
    const client = new SnippetClient({
      manifest: BASE_MANIFEST,
      fetch: fetchSpy,
      render: (markdown) => `<custom>${markdown}</custom>`
    });

    const snippet = await client.get("button");
    expect(snippet.html).toContain("<custom>");
  });
});
