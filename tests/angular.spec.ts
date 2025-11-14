import { describe, expect, it, vi } from "vitest";
import { firstValueFrom } from "rxjs";
import {
  MarkdownSnippetService,
  SNIPPET_CLIENT,
  SNIPPET_CLIENT_OPTIONS,
  provideSnippetClient
} from "../packages/core/src/angular/index";
import { SnippetClient } from "../packages/core/src/snippet-client";
import type { Snippet, SnippetMeta } from "../packages/core/src/types";

const BASE_SNIPPET: Snippet = {
  slug: "example",
  path: "example.md",
  html: "<p>example</p>",
  raw: "example",
  group: null
};

function createStubClient(overrides: Partial<SnippetClient> = {}): SnippetClient {
  const manifest: SnippetMeta[] = [
    {
      slug: "example",
      path: "example.md",
      group: "docs"
    }
  ];

  return {
    get: vi.fn(async (slug: string) => ({ ...BASE_SNIPPET, slug })),
    listAll: vi.fn(async () => manifest),
    listByGroup: vi.fn(async () => manifest),
    listByType: vi.fn(async () => manifest),
    search: vi.fn(async () => manifest),
    getHtml: vi.fn(async () => BASE_SNIPPET.html),
    invalidate: vi.fn(),
    invalidateSlug: vi.fn(),
    ...overrides
  } as unknown as SnippetClient;
}

describe("Angular adapter", () => {
  it("exposes providers that bootstrap a SnippetClient", () => {
    const providers = provideSnippetClient({ manifest: [] });
    const optionsProvider = providers.find((provider) => provider.provide === SNIPPET_CLIENT_OPTIONS);
    const clientProvider = providers.find((provider) => provider.provide === SNIPPET_CLIENT);

    expect(optionsProvider?.useValue).toMatchObject({ manifest: [] });
    expect(typeof clientProvider?.useFactory).toBe("function");

    const client = clientProvider?.useFactory(optionsProvider?.useValue as any);
    expect(client).toBeInstanceOf(SnippetClient);
  });

  it("wraps client calls with shared Observables", async () => {
    const stubClient = createStubClient();
    const service = new MarkdownSnippetService(stubClient);

    const stream = service.get("example");
    const [value1, value2] = await Promise.all([firstValueFrom(stream), firstValueFrom(stream)]);

    expect(value1.slug).toBe("example");
    expect(value2.slug).toBe("example");
    expect(stubClient.get).toHaveBeenCalledTimes(1);
  });

  it("maps html convenience method", async () => {
    const stubClient = createStubClient();
    const service = new MarkdownSnippetService(stubClient);

    const html = await firstValueFrom(service.html("example"));
    expect(html).toBe(BASE_SNIPPET.html);
    expect(stubClient.get).toHaveBeenCalledTimes(1);
  });
});
