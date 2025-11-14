# mark↓ React Adapter
*(published as `@mzebley/mark-down-react`)*

React bindings for the [mark↓ core runtime](../core/README.md). This package exposes context providers, hooks, and ready-to-use components that make it simple to render Markdown snippets safely. For a broader overview of the project, start with the [root README](../../README.md).

## Table of contents

1. [Installation](#installation)
2. [Provider setup](#provider-setup)
3. [Hooks](#hooks)
4. [`<SnippetView />` component](#snippetview--component)
5. [Server-side rendering](#server-side-rendering)
6. [TypeScript helpers](#typescript-helpers)
7. [Related packages](#related-packages)

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

`options` maps directly to the [`SnippetClient` configuration](../core/README.md#client-options), so you can provide custom fetchers, renderers, or manifest loaders as needed.

## Hooks

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

### `useSnippets(filter)`

List snippets by type, tags, or custom metadata:

```tsx
import { useSnippets } from '@mzebley/mark-down-react';

export function ComponentList() {
  const { snippets } = useSnippets({ type: 'component', tags: ['buttons'] });
  return (
    <ul>
      {snippets.map((snippet) => (
        <li key={snippet.slug}>{snippet.title}</li>
      ))}
    </ul>
  );
}
```

All hooks automatically dedupe requests and reuse cached results.

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
- Accepts `className`, `style`, and other DOM props for styling.
- Supports `renderSnippet` for full control over rendering if you prefer not to use `dangerouslySetInnerHTML`.

## Server-side rendering

When using Next.js, Remix, or another SSR framework, provide a server-safe fetch implementation:

```tsx
import fetch from 'node-fetch';
import { SnippetProvider } from '@mzebley/mark-down-react';

<SnippetProvider
  options={{
    manifest: () => import('../snippets-index.json'),
    fetcher: (input, init) => fetch(input as string, init),
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

## Related packages

- [Core runtime](../core/README.md)
- [CLI](../cli/README.md)
- [Angular adapter](../angular/README.md)
- [Example app](../../examples/basic/README.md)
- [Monorepo overview](../../README.md)
