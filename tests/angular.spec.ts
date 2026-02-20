import "@angular/compiler";
import { describe, expect, it, vi } from "vitest";
import { firstValueFrom, Observable, of, take, throwError, toArray } from "rxjs";
import { Injector, runInInjectionContext } from "@angular/core";
import { DomSanitizer, SafeHtml } from "@angular/platform-browser";
import {
  MarkdownSnippetService,
  SNIPPET_CLIENT,
  SNIPPET_CLIENT_OPTIONS,
  provideSnippetClient,
} from "../packages/core/src/angular/index";
import { SnippetService } from "../packages/angular/src/snippet.service";
import { SnippetViewComponent } from "../packages/angular/src/snippet-view.component";
import { SnippetClient } from "../packages/core/src/snippet-client";
import type { Snippet, SnippetMeta } from "../packages/core/src/types";

const BASE_SNIPPET: Snippet = {
  slug: "example",
  path: "example.md",
  html: "<p>example</p>",
  raw: "example",
  group: null,
};

function createStubClient(
  overrides: Partial<SnippetClient> = {},
): SnippetClient {
  const manifest: SnippetMeta[] = [
    {
      slug: "example",
      path: "example.md",
      group: "docs",
    },
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
    ...overrides,
  } as unknown as SnippetClient;
}

function createSnippetViewHarness(
  get: (slug: string) => Observable<Snippet>,
): {
  component: SnippetViewComponent;
  snippets: { get: ReturnType<typeof vi.fn> };
  sanitizer: { bypassSecurityTrustHtml: ReturnType<typeof vi.fn> };
} {
  const snippets = {
    get: vi.fn(get),
  };
  const sanitizer = {
    bypassSecurityTrustHtml: vi.fn(
      (value: string) => value as unknown as SafeHtml,
    ),
  };

  const injector = Injector.create({
    providers: [
      { provide: SnippetService, useValue: snippets as unknown as SnippetService },
      { provide: DomSanitizer, useValue: sanitizer as unknown as DomSanitizer },
    ],
  });

  const component = runInInjectionContext(
    injector,
    () => new SnippetViewComponent(),
  );

  return { component, snippets, sanitizer };
}

describe("Angular adapter", () => {
  it("exposes providers that bootstrap a SnippetClient", () => {
    const providers = provideSnippetClient({ manifest: [] });
    const optionsProvider = providers.find(
      (provider) => provider.provide === SNIPPET_CLIENT_OPTIONS,
    );
    const clientProvider = providers.find(
      (provider) => provider.provide === SNIPPET_CLIENT,
    );

    expect(optionsProvider?.useValue).toMatchObject({ manifest: [] });
    expect(typeof clientProvider?.useFactory).toBe("function");

    const clientFactory =
      clientProvider && "useFactory" in clientProvider
        ? clientProvider.useFactory
        : undefined;
    const optionsValue =
      optionsProvider && "useValue" in optionsProvider
        ? optionsProvider.useValue
        : undefined;
    const client = clientFactory?.(optionsValue);
    expect(client).toBeInstanceOf(SnippetClient);
  });

  it("wraps client calls with shared Observables", async () => {
    const stubClient = createStubClient();
    const service = new MarkdownSnippetService(stubClient);

    const stream = service.get("example");
    const [value1, value2] = await Promise.all([
      firstValueFrom(stream),
      firstValueFrom(stream),
    ]);

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

  it("snippet-view exposes loading then success state", async () => {
    const snippet = { ...BASE_SNIPPET, html: "<p><strong>Hello</strong></p>" };
    const { component, snippets, sanitizer } = createSnippetViewHarness(
      () => of(snippet),
    );
    const loadedSpy = vi.fn();
    component.loaded.subscribe(loadedSpy);

    component.slug = "example";
    component.ngOnChanges();

    const states = await firstValueFrom(component.state$.pipe(take(2), toArray()));

    expect(states[0]).toEqual({ loading: true, error: false, html: null });
    expect(states[1]).toMatchObject({ loading: false, error: false });
    expect(states[1].html).toBe("<p><strong>Hello</strong></p>");
    expect(snippets.get).toHaveBeenCalledWith("example");
    expect(sanitizer.bypassSecurityTrustHtml).toHaveBeenCalledWith(
      "<p><strong>Hello</strong></p>",
    );
    expect(loadedSpy).toHaveBeenCalledTimes(1);
    expect(loadedSpy).toHaveBeenCalledWith(snippet);
  });

  it("snippet-view exposes loading then error state", async () => {
    const { component, snippets } = createSnippetViewHarness(() =>
      throwError(() => new Error("boom")),
    );
    const loadedSpy = vi.fn();
    component.loaded.subscribe(loadedSpy);

    component.slug = "missing";
    component.ngOnChanges();

    const states = await firstValueFrom(component.state$.pipe(take(2), toArray()));

    expect(states[0]).toEqual({ loading: true, error: false, html: null });
    expect(states[1]).toEqual({ loading: false, error: true, html: null });
    expect(snippets.get).toHaveBeenCalledWith("missing");
    expect(loadedSpy).toHaveBeenCalledTimes(1);
    expect(loadedSpy).toHaveBeenCalledWith(undefined);
  });
});
