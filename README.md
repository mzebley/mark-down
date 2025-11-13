# mark↓
*(published as `@mzebley/mark-down`)*

A framework-agnostic snippet engine that indexes Markdown at build time and renders HTML safely at runtime.

## What is mark↓?
- `packages/core` exposes `SnippetClient` for fetching, caching, filtering, and rendering snippets anywhere TypeScript runs.
- `packages/cli` ships the `mark-down` CLI that builds and watches `snippets-index.json` manifests.
- `packages/angular` and `packages/react` adapt the runtime for framework idioms.
- `content/snippets` contains example Markdown sources.

## Author Markdown
```
content/
  snippets/
    getting-started/
      welcome.md
```
Each `.md` file may begin with YAML front-matter:
```
---
title: Hero Block
order: 1
tags:
  - intro
  - hero
---
```
Supported fields: `slug`, `title`, `order`, `type`, `tags`, `draft`. Any other keys are preserved under `extra`.

## Build the Manifest
```
npx mark-down build content/snippets
```
- Discovers Markdown, parses front-matter with `yaml`, normalizes slugs, removes drafts.
- Emits `snippets-index.json` (same folder by default).
- Exit code `2` indicates duplicate slugs.
- `mark-down watch content/snippets` keeps the manifest fresh via chokidar.

## Use the Core Runtime
```ts
import { SnippetClient } from "@mzebley/mark-down";

const client = new SnippetClient({ manifest: "/snippets-index.json" });
const hero = await client.get("getting-started-welcome");
const components = await client.listByType("component");
```
`SnippetClient` lazily fetches the manifest and snippets, re-parses front-matter with `gray-matter`, converts Markdown to HTML via `marked`, and caches everything in-memory.

## Angular Adapter
```ts
import { bootstrapApplication } from "@angular/platform-browser";
import { provideMarkDown, SnippetViewComponent } from "@mzebley/mark-down-angular";

bootstrapApplication(SnippetViewComponent, {
  providers: [
    ...provideMarkDown({ manifest: "/snippets-index.json" })
  ]
});
```
- `SnippetService` exposes RxJS Observables.
- `<snippet-view>` sanitizes HTML with `DomSanitizer` and emits `loaded` events.

## React Adapter
```tsx
import { SnippetProvider, SnippetView } from "@mzebley/mark-down-react";

export function App() {
  return (
    <SnippetProvider options={{ manifest: "/snippets-index.json" }}>
      <SnippetView slug="getting-started-welcome" />
    </SnippetProvider>
  );
}
```
- `SnippetProvider` wires a shared `SnippetClient` via context.
- `useSnippet(slug)` returns `{ snippet, loading, error }`.
- `<SnippetView>` sanitizes HTML with DOMPurify.

## Scripts
- `npm run build` – builds every package with `tsup`.
- `npm run test` – runs Vitest suites covering slug rules, CLI manifest logic, and runtime behavior.
- `npm run test:watch` – watch mode.
