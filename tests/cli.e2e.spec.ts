import fs from "node:fs";
import fsPromises from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { execa } from "execa";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function setupFiles(structure: Record<string, string>) {
  const dir = await fsPromises.mkdtemp(path.join(os.tmpdir(), "mark-down-cli-e2e-"));
  await Promise.all(
    Object.entries(structure).map(async ([relative, contents]) => {
      const filePath = path.join(dir, relative);
      await fsPromises.mkdir(path.dirname(filePath), { recursive: true });
      await fsPromises.writeFile(filePath, contents, "utf8");
    })
  );
  return dir;
}

async function ensureCliEntry() {
  const root = path.resolve(__dirname, "..");
  const cliEntry = path.join(root, "packages/cli/dist/index.mjs");

  if (!fs.existsSync(cliEntry)) {
    await execa("npm", ["run", "build", "-w", "@mzebley/mark-down-cli"], { cwd: root });
  }

  if (!fs.existsSync(cliEntry)) {
    throw new Error("mark↓ CLI build did not produce dist/index.mjs");
  }

  return cliEntry;
}

describe("mark-down CLI (e2e)", () => {
  it("compiles a page via the built binary", async () => {
    const cliEntry = await ensureCliEntry();

    const dir = await setupFiles({
      "snippets-index.json": JSON.stringify([
        { slug: "alpha", path: "snippets/alpha.md" },
        { slug: "beta", path: "snippets/beta.md" }
      ]),
      "snippets/alpha.md": `---\nslug: hero-section\n---\n**Hello** from alpha`,
      "snippets/beta.md": `Second snippet`,
      "index.html": `
        <section>
          <div data-snippet="alpha"></div>
          <div data-snippet="beta"></div>
        </section>
      `
    });

    const result = await execa(
      "node",
      [cliEntry, "compile-page", "index.html", "--manifest", "snippets-index.json", "--outDir", "out"],
      {
        cwd: dir
      }
    );

    expect(result.exitCode).toBe(0);

    const outputPath = path.join(dir, "out/index.html");
    expect(fs.existsSync(outputPath)).toBe(true);

    const html = await fsPromises.readFile(outputPath, "utf8");
    expect(html).toContain("<p><strong>Hello</strong> from alpha</p>");
    expect(html).toMatch(/id="hero-section"/);
    expect(html).toContain("<p>Second snippet</p>");
    expect(html).toMatch(/id="snippet-beta"/);
  });
});
