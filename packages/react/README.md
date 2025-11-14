# mark↓ React Adapter
*(published as `@mzebley/mark-down-react`)*

React bindings for the [mark↓ core runtime](../core/README.md). This package exposes context providers, hooks, and ready-to-use components that make it simple to render Markdown snippets safely. For a broader overview of the project, start with the [root README](../../README.md).

## Table of contents

1. [Installation](#installation)
2. [Provider setup](#provider-setup)
3. [Hook](#hook)
4. [`<SnippetView />` component](#snippetview--component)
5. [Server-side rendering](#server-side-rendering)
6. [TypeScript helpers](#typescript-helpers)
7. [Roadmap](#roadmap)
8. [Related packages](#related-packages)

## Installation

Install the adapter along with the core runtime and DOMPurify (used for sanitising HTML):

```bash
npm install @mzebley/mark-down-react @mzebley/mark-down dompurify
```

Generate a manifest with the [CLI](../cli/README.md) before rendering snippets.

## Provider setup

Wrap your app with the `SnippetProvider` so that hooks and components can access a shared client instance:

```tsx
import { SnippetProvider } from '@mzebley/mark-down-react';

export function App({ children }: { children: React.ReactNode }) {
  return (
    <SnippetProvider options={{ manifest: '/snippets-index.json' }}>
      {children}
    </SnippetProvider>
  );
}
```

`options` maps directly to the [`SnippetClient` configuration](../core/README.md#client-options), so you can provide custom fetch functions, base paths, or preloaded manifest arrays as needed.

## Hook

### `useSnippet(slug)`

Fetch a single snippet and track loading / error state:

```tsx
import { useSnippet } from '@mzebley/mark-down-react';

export function Hero() {
  const { snippet, loading, error } = useSnippet('getting-started-welcome');

  if (loading) return <p>Loading…</p>;
  if (error) return <p role="alert">Failed to load snippet.</p>;
  if (!snippet) return null;

  return <div dangerouslySetInnerHTML={{ __html: snippet.html }} />;
}
```

## `<SnippetView />` component

Render snippets declaratively with built-in loading and error fallbacks:

```tsx
import { SnippetView } from '@mzebley/mark-down-react';

<SnippetView
  slug="components-button"
  loadingFallback={<p>Loading…</p>}
  errorFallback={<p role="alert">Unable to load snippet.</p>}
  onLoaded={(snippet) => console.log('Rendered', snippet.slug)}
/>;
```

Features:

- Uses DOMPurify under the hood for HTML sanitisation.
- Accepts `className` for styling and emits `onLoaded(snippet)` once HTML resolves.
- Customise UX via `loadingFallback` / `errorFallback`, or render the hook directly for complete control.

## Server-side rendering

When using Next.js, Remix, or another SSR framework, provide a server-safe fetch implementation:

```tsx
import fetch from 'node-fetch';
import { SnippetProvider } from '@mzebley/mark-down-react';

<SnippetProvider
  options={{
    manifest: () => import('../snippets-index.json'),
    fetch: (url) => fetch(url).then((response) => {
      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }
      return response;
    }),
  }}
>
  {children}
</SnippetProvider>;
```

Because the adapter defers to the core runtime, SSR works the same way as the base client. Pair with framework-specific data fetching if you prefer to prehydrate snippets.

## TypeScript helpers

All exported hooks and components ship with rich TypeScript definitions:

- Use the `Snippet` and `SnippetMeta` types from `@mzebley/mark-down` to annotate props.
- Narrow snippet metadata with generics: `useSnippet<CustomExtra>('slug')`.
- Leverage the `SnippetContextValue` interface when mocking providers in tests.

## Roadmap

- **Collection hooks** – add `useSnippets` for list queries and pagination helpers for design system docs.
- **Suspense support** – optional wrappers that expose a resource-style API for React 18 concurrent features.
- **Custom sanitizers** – let consumers inject DOMPurify configs or alternate HTML sanitizers.
- **Storybook plugin** – surface snippets inside Storybook/Chromatic panels for quick previews.

## Related packages

- [Core runtime](../core/README.md)
- [CLI](../cli/README.md)
- [Angular adapter](../angular/README.md)
- [Example app](../../examples/basic/README.md)
- [Monorepo overview](../../README.md)
