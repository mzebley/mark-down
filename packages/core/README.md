# mark↓
*(published as `@mzebley/mark-down`)*

Core runtime utilities for loading `snippets-index.json`, fetching Markdown, and rendering HTML on-demand.

## Install
```
npm install @mzebley/mark-down
```

## Usage
```ts
import { SnippetClient } from "@mzebley/mark-down";

const client = new SnippetClient({ manifest: "/snippets-index.json" });
const hero = await client.get("getting-started-welcome");
const components = await client.listByType("component");
```

### Options
- `manifest`: URL, array, or function returning manifest entries.
- `fetcher`: custom fetch (useful for SSR environments).
- `markdownRenderer`: pluggable renderer (defaults to `marked`).
- `resolveSnippetPath`: customize how snippet asset URLs are built.

### Types
- `SnippetMeta` – metadata stored in the manifest.
- `Snippet` – metadata plus `markdown` and `html` payloads.
- `SnippetFilter` / `ListOptions` – helper types for filtering.

## Testing
```
npm run test -- core
```
Vitest suites cover caching, filtering, and markdown conversion.
