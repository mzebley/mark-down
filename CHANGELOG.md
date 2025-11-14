# Changelog

## 1.1.0

### Added
- Redesigned `SnippetClient` with explicit options for `base`, `fetch`, `frontMatter`, `cache`, and `verbose`, plus custom Markdown rendering via `render`.
- New caching controls with `invalidate()` and `invalidateSlug()` alongside manifest and snippet memoisation.
- Expanded search helpers (`listAll`, `listByGroup`, `listByType`, `search`, `getHtml`) and stricter error handling through `SnippetNotFoundError` and `ManifestLoadError`.
- YAML front-matter parsing with `yaml`, preservation of unknown keys via `meta.extra`, and optional `raw` Markdown on `Snippet`.
- Secondary Angular entry point `@mzebley/mark-down/angular` exposing `provideSnippetClient`, `SNIPPET_CLIENT`, and `MarkdownSnippetService` with RxJS caching.
- Angular adapter compatibility across versions 17, 18, 19, and 20 with relaxed peer dependency ranges.
- Unit tests covering path resolution, caching, search behaviour, and Angular adapter observables.

### Changed
- Package exports now provide ESM builds at `dist/index.js` and `dist/angular/index.js` with `sideEffects: false` for improved tree-shaking.
- Documentation updates for core, Angular, and React packages reflecting new APIs and Angular compatibility matrix.
- `@mzebley/mark-down-angular` re-exports the shared Angular entry point while retaining the `<snippet-view>` component.

### Removed
- Legacy `fetcher`, `markdownRenderer`, and `resolveSnippetPath` options in favour of the consolidated `fetch`, `base`, and `render` hooks.
- Dependency on `gray-matter`; front-matter is parsed with `yaml` directly.
