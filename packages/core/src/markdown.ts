import { marked } from "marked";

export function renderMarkdown(markdown: string): string {
  const html = marked.parse(markdown);

  if (typeof html === "string") {
    return html;
  }

  throw new Error("renderMarkdown unexpectedly returned a Promise");
}
