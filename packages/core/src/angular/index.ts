import { Inject, Injectable, InjectionToken, Provider } from "@angular/core";
import { from, map, Observable, shareReplay } from "rxjs";
import { SnippetClient } from "../snippet-client";
import type { Snippet, SnippetClientOptions, SnippetMeta } from "../types";

export const SNIPPET_CLIENT = new InjectionToken<SnippetClient>("@mzebley/mark-down/SNIPPET_CLIENT");
export const SNIPPET_CLIENT_OPTIONS = new InjectionToken<SnippetClientOptions>(
  "@mzebley/mark-down/SNIPPET_CLIENT_OPTIONS"
);

export function provideSnippetClient(options: SnippetClientOptions): Provider[] {
  return [
    { provide: SNIPPET_CLIENT_OPTIONS, useValue: options },
    {
      provide: SNIPPET_CLIENT,
      useFactory: (opts: SnippetClientOptions) => new SnippetClient(opts),
      deps: [SNIPPET_CLIENT_OPTIONS]
    }
  ];
}

@Injectable({ providedIn: "root" })
export class MarkdownSnippetService {
  constructor(@Inject(SNIPPET_CLIENT) private readonly client: SnippetClient) {}

  get(slug: string): Observable<Snippet> {
    return from(this.client.get(slug)).pipe(shareReplay({ bufferSize: 1, refCount: true }));
  }

  listAll(): Observable<SnippetMeta[]> {
    return from(this.client.listAll()).pipe(shareReplay({ bufferSize: 1, refCount: true }));
  }

  listByGroup(group: string): Observable<SnippetMeta[]> {
    return from(this.client.listByGroup(group)).pipe(shareReplay({ bufferSize: 1, refCount: true }));
  }

  listByType(type: string): Observable<SnippetMeta[]> {
    return from(this.client.listByType(type)).pipe(shareReplay({ bufferSize: 1, refCount: true }));
  }

  html(slug: string): Observable<string> {
    return this.get(slug).pipe(map((snippet) => snippet.html));
  }
}
