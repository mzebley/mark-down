import { createContext, ReactNode, useContext, useMemo } from "react";
import { SnippetClient, type SnippetClientOptions } from "@mzebley/mark-down";

const SnippetClientContext = createContext<SnippetClient | null>(null);

export interface SnippetProviderProps {
  client?: SnippetClient;
  options?: SnippetClientOptions;
  children: ReactNode;
}

export function SnippetProvider({ client, options, children }: SnippetProviderProps) {
  const value = useMemo(() => {
    if (client) {
      return client;
    }
    if (options) {
      return new SnippetClient(options);
    }
    throw new Error("SnippetProvider requires either a client or options");
  }, [client, options]);

  return <SnippetClientContext.Provider value={value}>{children}</SnippetClientContext.Provider>;
}

export function useSnippetClient(): SnippetClient {
  const client = useContext(SnippetClientContext);
  if (!client) {
    throw new Error("useSnippetClient must be used within a SnippetProvider");
  }
  return client;
}
