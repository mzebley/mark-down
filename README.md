# mark↓
*(published as `@mzebley/mark-down`)*

A framework-agnostic snippet engine that indexes Markdown at build time and renders HTML safely at runtime.

- Looking for the package docs? Jump directly to the [Core runtime](packages/core/README.md), [CLI](packages/cli/README.md), [Angular adapter](packages/angular/README.md), or [React adapter](packages/react/README.md).
- Want to poke around an end-to-end example? See [`examples/basic`](examples/basic/README.md).

## Table of contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Repository structure](#repository-structure)
4. [Quick start](#quick-start)
5. [Writing snippets](#writing-snippets)
6. [Using the runtime](#using-the-runtime)
7. [Framework adapters](#framework-adapters)
8. [Workspace scripts](#workspace-scripts)
9. [Roadmap](#roadmap)
10. [Further reading](#further-reading)

## Overview

mark↓ separates content authorship from rendering. Markdown files live alongside your application, the CLI turns them into a searchable manifest, and the runtime clients render sanitized HTML when requested. The project ships as a monorepo containing:

- `@mzebley/mark-down` – core TypeScript client utilities for fetching, caching, and rendering snippets.
- `@mzebley/mark-down-cli` – the CLI that scans Markdown, parses YAML front matter, and produces a `snippets-index.json` manifest. It can also pre-render HTML pages at build time with `compile-page`.
- `@mzebley/mark-down-angular` – first-party bindings for Angular applications.
- `@mzebley/mark-down-react` – first-party bindings for React applications.

Everything is published under the `@mzebley` scope on npm.

## Prerequisites

- **Node.js 18+** (LTS recommended) and **npm 9+**.
- A directory of Markdown files with optional YAML front matter.
- Permission to install dependencies (globally for the CLI, or locally via `npx`).

Clone the repo and install dependencies once:

```bash
git clone https://github.com/your-org/mark-down.git
cd mark-down
npm install
```

The workspace uses npm workspaces, so a single install wires up every package.

## Repository structure

```
mark-down/
├─ content/              # Example Markdown snippets
├─ examples/             # Sample applications that consume the runtime
├─ packages/
│  ├─ angular/           # Angular adapter (library + docs)
│  ├─ cli/               # CLI implementation and command docs
│  ├─ core/              # Framework-agnostic runtime client
│  └─ react/             # React adapter (hooks + components)
└─ tests/                # Vitest suites covering CLI and runtime behaviour
```

Each package README dives deeper into configuration details, API references, and framework-specific usage patterns.

## Quick start

1. **Author Markdown snippets** – place Markdown files under `content/snippets` (or any directory you choose). Each file can optionally declare YAML front matter for metadata like `title`, `type`, and `tags`.
2. **Build the manifest** – run the CLI to index snippets and generate `snippets-index.json`.
3. **Render snippets** – consume the manifest with the core runtime or one of the framework adapters.
4. **(Optional) Pre-render HTML** – hydrate `data-snippet` placeholders at build time with `mark-down compile-page`.

### 1. Author snippets

```
content/
  snippets/
    getting-started/
      welcome.md
```

Each `.md` file may begin with YAML front matter:

```yaml
---
title: Hero Block
order: 1
tags:
  - intro
  - hero
---
```

Supported fields: `slug`, `title`, `order`, `type`, `tags`, `draft`. Any other keys are preserved under `extra` for custom metadata.

### 2. Build the manifest

```bash
npx mark-down build content/snippets
```

Key behaviours:

- Discovers Markdown recursively, parses front matter with `yaml`, normalizes slugs, removes drafts, and sorts output.
- Emits `snippets-index.json` in the source directory by default (pass `--outDir` to change it; see the [CLI docs](packages/cli/README.md)).
- Returns exit code `2` if duplicate slugs are encountered.
- Use `mark-down watch content/snippets` to rebuild automatically while authoring.

### 3. Render snippets

```ts
import { SnippetClient } from "@mzebley/mark-down";

const client = new SnippetClient({ manifest: "/snippets-index.json" });

const hero = await client.get("getting-started-welcome");
const components = await client.listByType("component");
```

The client lazily fetches the manifest and snippets, parses YAML front matter with `yaml`, converts Markdown to HTML via `marked`, and caches everything in memory. See the [core runtime guide](packages/core/README.md) for option reference and advanced patterns like custom fetch functions or cache invalidation.

### 4. (Optional) Pre-render HTML pages

If you ship static sites that already include `data-snippet` placeholders, you can hydrate them at build time instead of in the browser:

```bash
npx mark-down compile-page www/index.html --manifest www/snippets-index.json --outDir dist
```

The command reads the HTML, loads snippets from the manifest on disk, strips front matter, renders Markdown with the same pipeline used at runtime, and writes a fully populated HTML file to `dist/index.html`. Pass `--inPlace` to overwrite the source file. Table-of-contents or other runtime-only transforms still happen client-side.

## Writing snippets

- **Slug control** – override the derived slug with `slug: your-custom-id` in front matter.
- **Draft content** – mark drafts with `draft: true`; the CLI omits them from the manifest.
- **Grouping & filtering** – populate `type`, `tags`, or custom keys for filtering through `SnippetClient.list` APIs.
- **Assets** – reference images or files using relative paths; provide your own `resolveSnippetPath` callback if they live outside the manifest directory.

## Using the runtime

The runtime ships as a portable TypeScript package. It supports modern browsers, Node.js, and SSR environments. Highlights:

- `SnippetClient` – fetch individual snippets (`get`) and filter them via `listAll`, `listByGroup`, `listByType`, and `search` while hydrating cached results.
- Pluggable fetch & caching – inject a custom `fetch` implementation for SSR, control caching via `cache` and `invalidate()` APIs, and customise the Markdown renderer with the optional `render` hook.
- Type-safe results – TypeScript definitions for `Snippet`, `SnippetMeta`, and filters ensure predictable metadata access.

Visit the [core README](packages/core/README.md) for end-to-end examples and API details.

### Static sites / CDN usage

Need to include mark↓ inside a plain HTML page with no build step? Use the browser-ready bundle:

```html
<script type="module">
  import { SnippetClient } from "https://cdn.jsdelivr.net/npm/@mzebley/mark-down/dist/browser.js";
  const client = new SnippetClient({ manifest: "./snippets-index.json" });
  const snippet = await client.get("home-hero");
  document.querySelector("#hero").innerHTML = snippet.html;
</script>
```

The bundle auto-installs the small `Buffer` shim required by the runtime, so no additional polyfills are necessary.

## Framework adapters

- [Angular adapter](packages/angular/README.md) – Standalone provider, `MarkdownSnippetService`, and `<snippet-view>` component that work seamlessly with Angular dependency injection across versions 17–20.
- [React adapter](packages/react/README.md) – Context provider, hooks, and a `<SnippetView />` component powered by DOMPurify.

Each adapter builds on the core runtime and adds ergonomics tailored to the framework (e.g., Observables for Angular and hooks for React). Their READMEs include installation notes, SSR tips, and extension points.

## Workspace scripts

- `npm run build` – builds every package with `tsup`.
- `npm run test` – runs Vitest suites covering slug rules, CLI manifest logic, and runtime behaviour.
- `npm run test:watch` – runs tests in watch mode during local development.
- `npm run lint` / `npm run format` – optional linting and formatting helpers.
- `npm run release` – runs tests, builds every package, and publishes all workspaces to npm (requires `npm login`).

Run scripts from the repository root; npm scopes the command to each workspace automatically.

## Roadmap

The first release focuses on the core workflow (author → build → render). Upcoming ideas under consideration:

- **Preview server + hot reload** – stream snippet updates to dev servers so component libraries can refresh in-place.
- **Schema-aware metadata** – allow teams to define JSON schemas for front-matter and validate during `mark-down build`.
- **MDX / remark pipelines** – optional processors that can enrich Markdown before it lands in the manifest.
- **More adapters** – Vue, Svelte, and Web Components bindings built on top of the same core runtime.
- **Editor tooling** – VS Code extension / design system workbench that queries `snippets-index.json`.

Have a use case to prioritise? File a feature request or open a discussion in the repo.

## Further reading

- [CLI usage & configuration](packages/cli/README.md)
- [Runtime API reference](packages/core/README.md)
- [Angular integration guide](packages/angular/README.md)
- [React integration guide](packages/react/README.md)
- [Example application walkthrough](examples/basic/README.md)

If you are onboarding for the first time, start with the Quick Start above, then dive into the package guides that match your stack.
