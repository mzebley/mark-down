# mark↓
*(published as `@mzebley/mark-down`)*

`@mzebley/mark-down-react` offers the mark↓ React Adapter including context, hooks, and a ready-to-use component.

## Install
```
npm install @mzebley/mark-down-react @mzebley/mark-down dompurify
```

## Provider + Hook
```tsx
import { SnippetProvider, useSnippet } from "@mzebley/mark-down-react";

function Hero() {
  const { snippet, loading } = useSnippet("getting-started-welcome");
  if (loading || !snippet) return null;
  return <div dangerouslySetInnerHTML={{ __html: snippet.html }} />;
}

export function App() {
  return (
    <SnippetProvider options={{ manifest: "/snippets-index.json" }}>
      <Hero />
    </SnippetProvider>
  );
}
```

## `<SnippetView />`
```tsx
<SnippetView slug="components-button" className="snippet" />
```
- Uses DOMPurify for HTML sanitization.
- Emits reasonable loading/error fallbacks (customizable via props).
- Calls `onLoaded(snippet)` once content resolves.
