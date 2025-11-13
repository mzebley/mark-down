import { describe, expect, it, vi } from "vitest";
import { SnippetClient } from "../packages/core/src/snippet-client";
import type { SnippetMeta } from "../packages/core/src/types";

function createResponse(body: string) {
  return {
    ok: true,
    status: 200,
    async text() {
      return body;
    }
  };
}

describe("SnippetClient", () => {
  const manifest: SnippetMeta[] = [
    {
      slug: "hello-world",
      path: "getting-started/hello.md",
      group: "getting-started",
      title: undefined,
      order: 1,
      extra: { theme: "light" }
    },
    {
      slug: "component-button",
      path: "components/button.md",
      group: "components",
      title: "Button",
      type: "component"
    }
  ];

  it("fetches snippets and caches responses", async () => {
    const responses: Record<string, ReturnType<typeof createResponse>> = {
      "getting-started/hello.md": createResponse(`---\ntitle: Runtime Hello\ncustom: true\n---\n**Hi** from runtime`)
    };
    const fetcher = vi.fn(async (input: string) => responses[input]);

    const client = new SnippetClient({
      manifest,
      fetcher,
      markdownRenderer: (markdown) => `<p>${markdown}</p>`
    });

    const snippet = await client.get("hello-world");
    expect(snippet?.title).toBe("Runtime Hello");
    expect(snippet?.extra).toMatchObject({ theme: "light", custom: true });
    expect(snippet?.html).toContain("<p>");

    await client.get("hello-world");
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("filters via list helpers", async () => {
    const client = new SnippetClient({
      manifest,
      fetcher: async (input: string) => createResponse(input)
    });

    const byType = await client.listByType("component");
    expect(byType).toHaveLength(1);
    expect(byType[0].slug).toBe("component-button");

    const paged = await client.list({ limit: 1, offset: 1 });
    expect(paged).toHaveLength(1);
    expect(paged[0].slug).toBe("component-button");
  });
});
