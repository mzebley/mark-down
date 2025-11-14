import type { Provider } from "@angular/core";
import {
  SNIPPET_CLIENT,
  SNIPPET_CLIENT_OPTIONS,
  provideSnippetClient,
  type SnippetClientOptions
} from "@mzebley/mark-down/angular";

export const MARK_DOWN_CLIENT = SNIPPET_CLIENT;
export const MARK_DOWN_OPTIONS = SNIPPET_CLIENT_OPTIONS;

export function provideMarkDown(options: SnippetClientOptions): Provider[] {
  return provideSnippetClient(options);
}
