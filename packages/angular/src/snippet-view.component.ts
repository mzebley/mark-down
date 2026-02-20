import { CommonModule } from "@angular/common";
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  inject,
} from "@angular/core";
import { DomSanitizer, SafeHtml } from "@angular/platform-browser";
import { BehaviorSubject, Observable, of } from "rxjs";
import {
  catchError,
  map,
  shareReplay,
  startWith,
  switchMap,
  tap,
} from "rxjs/operators";
import type { Snippet } from "@mzebley/mark-down";
import { SnippetService } from "./snippet.service";
import DOMPurify from "dompurify";

@Component({
  selector: "snippet-view",
  standalone: true,
  imports: [CommonModule],
  template: `
    <ng-container *ngIf="state$ | async as state">
      <div *ngIf="state.loading" class="mark-down-snippet--loading">
        Loading snippet…
      </div>
      <div *ngIf="!state.loading && state.error" class="mark-down-snippet--error">
        Unable to load snippet.
      </div>
      <div
        *ngIf="!state.loading && !state.error && state.html !== null"
        class="mark-down-snippet"
        [innerHTML]="state.html"
      ></div>
      <div
        *ngIf="!state.loading && !state.error && state.html === null"
        class="mark-down-snippet--empty"
      >
        Snippet not found.
      </div>
    </ng-container>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SnippetViewComponent implements OnChanges {
  private readonly slug$ = new BehaviorSubject<string | null>(null);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly snippets = inject(SnippetService);

  @Input() slug?: string;
  @Output() readonly loaded = new EventEmitter<Snippet | undefined>();

  readonly state$: Observable<{
    loading: boolean;
    error: boolean;
    html: SafeHtml | null;
  }> = this.slug$.pipe(
    switchMap((slug) =>
      slug
        ? this.snippets.get(slug).pipe(
            map((snippet) => ({ loading: false, error: false, snippet })),
            catchError(() =>
              of({ loading: false, error: true, snippet: null as Snippet | null }),
            ),
            startWith({ loading: true, error: false, snippet: null as Snippet | null }),
          )
        : of({ loading: false, error: false, snippet: null as Snippet | null }),
    ),
    tap((state) => {
      if (!state.loading) {
        this.loaded.emit(state.snippet ?? undefined);
      }
    }),
    map((state) => ({
      loading: state.loading,
      error: state.error,
      html: this.toSafeHtml(state.snippet),
    })),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  readonly content$: Observable<SafeHtml | null> = this.state$.pipe(
    map((state) => state.html),
  );

  ngOnChanges(): void {
    this.slug$.next(this.slug ?? null);
  }

  private toSafeHtml(snippet: Snippet | null): SafeHtml | null {
    if (!snippet) {
      return null;
    }
    if (typeof window === "undefined") {
      return this.sanitizer.bypassSecurityTrustHtml(snippet.html);
    }
    const sanitized = DOMPurify.sanitize(snippet.html);
    return this.sanitizer.bypassSecurityTrustHtml(sanitized);
  }
}
