import { useEffect, useState } from "react";
import type { Snippet } from "@mzebley/mark-down";
import { useSnippetClient } from "./context";

export interface UseSnippetResult {
  snippet?: Snippet;
  loading: boolean;
  error?: Error;
}

export function useSnippet(slug?: string | null): UseSnippetResult {
  const client = useSnippetClient();
  const [result, setResult] = useState<UseSnippetResult>(() => ({
    loading: Boolean(slug)
  }));

  useEffect(() => {
    if (!slug) {
      setResult({ loading: false });
      return;
    }

    let cancelled = false;
    setResult((prev) => ({ ...prev, loading: true, error: undefined }));

    client
      .get(slug)
      .then((snippet) => {
        if (cancelled) return;
        setResult({ snippet, loading: false });
      })
      .catch((error: Error) => {
        if (cancelled) return;
        setResult({ loading: false, error });
      });

    return () => {
      cancelled = true;
    };
  }, [client, slug]);

  return result;
}
