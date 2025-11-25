import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { buildManifest } from "../packages/cli/src/manifest";
import { DuplicateSlugError } from "../packages/cli/src/errors";
import { compilePage } from "../packages/cli/src/compile-page";

async function setupFiles(structure: Record<string, string>) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "mark-down-cli-"));
  await Promise.all(
    Object.entries(structure).map(async ([relative, contents]) => {
      const filePath = path.join(dir, relative);
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, contents, "utf8");
    })
  );
  return dir;
}

describe("buildManifest", () => {
  it("parses metadata, filters drafts, and sorts", async () => {
    const dir = await setupFiles({
      "design/card.md": `---\ntitle: Card\norder: 2\n---\nBody`,
      "design/hero.md": `---\ntitle: Hero\norder: 1\n---\nHero`,
      "draft.md": `---\ndraft: true\n---\nHidden`
    });

    const manifest = await buildManifest(dir);

    expect(manifest).toMatchInlineSnapshot(`
      [
        {
          "draft": undefined,
          "extra": undefined,
          "group": "design",
          "order": 1,
          "path": "design/hero.md",
          "slug": "design-hero",
          "tags": undefined,
          "title": "Hero",
          "type": undefined,
        },
        {
          "draft": undefined,
          "extra": undefined,
          "group": "design",
          "order": 2,
          "path": "design/card.md",
          "slug": "design-card",
          "tags": undefined,
          "title": "Card",
          "type": undefined,
        },
      ]
    `);
  });

  it("throws when duplicate slugs are detected", async () => {
    const dir = await setupFiles({
      "a.md": `---\nslug: shared\n---\nA`,
      "b.md": `---\nslug: shared\n---\nB`
    });

    await expect(buildManifest(dir)).rejects.toBeInstanceOf(DuplicateSlugError);
  });
});

describe("compilePage", () => {
  it("hydrates snippets and writes to outDir", async () => {
    const dir = await setupFiles({
      "snippets-index.json": JSON.stringify([
        { slug: "alpha", path: "snippets/alpha.md" },
        { slug: "bravo", path: "snippets/bravo.md" }
      ]),
      "snippets/alpha.md": `---\nslug: alpha-title\n---\n**Hello**`,
      "snippets/bravo.md": `Second snippet`,
      "index.html": `
        <section>
          <div data-snippet="alpha"></div>
          <div data-snippet="missing">keep</div>
          <div data-snippet="bravo"></div>
        </section>
      `
    });

    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const outputDir = path.join(dir, "out");
    const outputPath = await compilePage(path.join(dir, "index.html"), {
      manifest: path.join(dir, "snippets-index.json"),
      outDir: outputDir
    });

    expect(outputPath).toBe(path.join(outputDir, "index.html"));

    const html = await fs.readFile(outputPath, "utf8");
    expect(html).toContain('<p><strong>Hello</strong></p>');
    expect(html).toContain('id="alpha-title"');
    expect(html).toContain('<p>Second snippet</p>');
    expect(html).toContain('<div data-snippet="missing">keep</div>');
    expect(warnSpy).toHaveBeenCalledWith('mark↓: no snippet found for "missing"');

    warnSpy.mockRestore();
  });

  it("overwrites source when inPlace is set", async () => {
    const dir = await setupFiles({
      "snippets-index.json": JSON.stringify([{ slug: "alpha", path: "alpha.md" }]),
      "alpha.md": `Alpha`,
      "page.html": `<div data-snippet="alpha"></div>`
    });

    const outputPath = await compilePage(path.join(dir, "page.html"), {
      manifest: path.join(dir, "snippets-index.json"),
      inPlace: true
    });

    expect(outputPath).toBe(path.join(dir, "page.html"));
    const html = await fs.readFile(path.join(dir, "page.html"), "utf8");
    expect(html).toContain('<p>Alpha</p>');
  });
});
