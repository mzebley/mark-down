import { Inject, Injectable } from "@angular/core";
import { from, map, Observable, shareReplay } from "rxjs";
import type { ListOptions, Snippet, SnippetMeta } from "@mzebley/mark-down";
import { SnippetClient } from "@mzebley/mark-down";
import { MARK_DOWN_CLIENT } from "./token";

@Injectable({ providedIn: "root" })
export class SnippetService {
  constructor(@Inject(MARK_DOWN_CLIENT) private readonly client: SnippetClient) {}

  get(slug: string): Observable<Snippet | undefined> {
    return from(this.client.get(slug)).pipe(shareReplay(1));
  }

  list(options?: ListOptions): Observable<SnippetMeta[]> {
    return from(this.client.list(options)).pipe(shareReplay(1));
  }

  listByGroup(group: string, options?: ListOptions): Observable<SnippetMeta[]> {
    return from(this.client.listByGroup(group, options)).pipe(shareReplay(1));
  }

  listByType(type: string, options?: ListOptions): Observable<SnippetMeta[]> {
    return from(this.client.listByType(type, options)).pipe(shareReplay(1));
  }

  html(slug: string): Observable<string | null> {
    return this.get(slug).pipe(map((snippet) => snippet?.html ?? null));
  }
}
