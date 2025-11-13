# mark↓
*(published as `@mzebley/mark-down`)*

`@mzebley/mark-down-angular` provides the mark↓ Angular Adapter with a provider, service, and `<snippet-view>` component.

## Install
```
npm install @mzebley/mark-down-angular @mzebley/mark-down
```

## Provide a Client
```ts
import { provideMarkDown } from "@mzebley/mark-down-angular";

bootstrapApplication(AppComponent, {
  providers: [
    ...provideMarkDown({ manifest: "/snippets-index.json" })
  ]
});
```

## SnippetService
```ts
export class DocsComponent {
  readonly hero$ = this.snippets.get("getting-started-welcome");

  constructor(private readonly snippets: SnippetService) {}
}
```
All service methods (`get`, `list`, `listByGroup`, `listByType`) return cold Observables with shared caches.

## `<snippet-view>` Component
```html
<snippet-view [slug]="'getting-started-welcome'" (loaded)="onLoaded($event)"></snippet-view>
```
- Standalone component pulling in `CommonModule`.
- Uses `DomSanitizer.bypassSecurityTrustHtml` to render safely.
- Emits `loaded` once snippet HTML resolves.
