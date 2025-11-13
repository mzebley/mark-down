import { InjectionToken, Provider } from "@angular/core";
import { SnippetClient, type SnippetClientOptions } from "@mzebley/mark-down";

export const MARK_DOWN_CLIENT = new InjectionToken<SnippetClient>("mark-down-client");
export const MARK_DOWN_OPTIONS = new InjectionToken<SnippetClientOptions>("mark-down-options");

export function provideMarkDown(options: SnippetClientOptions, client?: SnippetClient): Provider[] {
  return [
    { provide: MARK_DOWN_OPTIONS, useValue: options },
    {
      provide: MARK_DOWN_CLIENT,
      useFactory: (opts: SnippetClientOptions) => client ?? new SnippetClient(opts),
      deps: [MARK_DOWN_OPTIONS]
    }
  ];
}
