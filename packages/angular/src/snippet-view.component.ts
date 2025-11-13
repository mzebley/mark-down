import { CommonModule } from "@angular/common";
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  inject
} from "@angular/core";
import { DomSanitizer, SafeHtml } from "@angular/platform-browser";
import { BehaviorSubject, Observable, of } from "rxjs";
import { map, shareReplay, switchMap, tap } from "rxjs/operators";
import type { Snippet } from "@mzebley/mark-down";
import { SnippetService } from "./snippet.service";
import DOMPurify from "dompurify";

@Component({
  selector: "snippet-view",
  standalone: true,
  imports: [CommonModule],
  template: `
    <ng-container *ngIf="content$ | async as html; else loading">
      <div class="mark-down-snippet" [innerHTML]="html"></div>
    </ng-container>
    <ng-template #loading>
      <div class="mark-down-snippet--loading">Loading snippet…</div>
    </ng-template>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SnippetViewComponent implements OnChanges {
  private readonly slug$ = new BehaviorSubject<string | null>(null);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly snippets = inject(SnippetService);

  @Input() slug?: string;
  @Output() readonly loaded = new EventEmitter<Snippet | undefined>();

  private readonly snippet$: Observable<Snippet | undefined> = this.slug$.pipe(
    switchMap((slug) => (slug ? this.snippets.get(slug) : of(undefined))),
    tap((snippet) => this.loaded.emit(snippet)),
    shareReplay(1)
  );

  readonly content$: Observable<SafeHtml | null> = this.snippet$.pipe(
    map((snippet) => {
      if (!snippet) {
        return null;
      }
      const sanitized = DOMPurify.sanitize(snippet.html);
      return this.sanitizer.bypassSecurityTrustHtml(sanitized);
    })
  );

  ngOnChanges(): void {
    this.slug$.next(this.slug ?? null);
  }
}
