import { ReactNode, useEffect, useMemo } from "react";
import DOMPurify from "dompurify";
import type { Snippet } from "@mzebley/mark-down";
import { useSnippet } from "./hooks";

export interface SnippetViewProps {
  slug: string;
  className?: string;
  loadingFallback?: ReactNode;
  errorFallback?: ReactNode;
  onLoaded?: (snippet?: Snippet) => void;
}

export function SnippetView({
  slug,
  className,
  loadingFallback = "Loading…",
  errorFallback = "Unable to load snippet",
  onLoaded
}: SnippetViewProps) {
  const state = useSnippet(slug);
  const safeHtml = useMemo(() => (state.snippet ? DOMPurify.sanitize(state.snippet.html) : undefined), [state.snippet]);

  useEffect(() => {
    onLoaded?.(state.snippet);
  }, [state.snippet, onLoaded]);

  if (state.loading) {
    return <div className={className}>{loadingFallback}</div>;
  }

  if (state.error) {
    return <div className={className}>{errorFallback}</div>;
  }

  if (!state.snippet) {
    return <div className={className}>Snippet not found</div>;
  }

  return <div className={className} dangerouslySetInnerHTML={{ __html: safeHtml ?? \"\" }} />;
}
