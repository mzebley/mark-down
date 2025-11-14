import { describe, expect, it, beforeEach, afterEach } from "vitest";

describe("browser bundle", () => {
  let originalBuffer: typeof Buffer | undefined;

  beforeEach(() => {
    originalBuffer = globalThis.Buffer;
    // @ts-expect-error intentionally removing Buffer to simulate browsers.
    delete globalThis.Buffer;
  });

  afterEach(() => {
    if (originalBuffer) {
      globalThis.Buffer = originalBuffer;
    } else {
      // @ts-expect-error cleanup
      delete globalThis.Buffer;
    }
  });

  it("installs the Buffer shim and renders snippets", async () => {
    const module = await import("../packages/core/src/browser");
    const { SnippetClient } = module;

    const manifest = [
      {
        slug: "browser-test",
        path: "/snippets/browser-test.md",
        group: "docs"
      }
    ];

    const client = new SnippetClient({
      manifest,
      fetcher: async () => ({
        ok: true,
        status: 200,
        async text() {
          return "---\ntitle: From Browser\n---\nHello from the browser bundle.";
        }
      }),
      markdownRenderer: (markdown) => `<p>${markdown}</p>`
    });

    const snippet = await client.get("browser-test");

    expect(snippet?.title).toBe("From Browser");
    expect(snippet?.html).toContain("<p>");
    expect(globalThis.Buffer).toBeDefined();
    expect(Buffer.isBuffer(Buffer.from("test"))).toBe(true);
  });
});
