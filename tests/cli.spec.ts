import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { buildManifest } from "../packages/cli/src/manifest";
import { DuplicateSlugError } from "../packages/cli/src/errors";

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
