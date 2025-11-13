import { describe, expect, it } from "vitest";
import { normalizeSlug } from "../packages/core/src/slug";

describe("normalizeSlug", () => {
  it("normalizes spaces and punctuation", () => {
    expect(normalizeSlug("Hello World!"))
      .toEqual("hello-world");
  });

  it("collapses repeated separators", () => {
    expect(normalizeSlug("Fancy___Snippet---Name")).toEqual("fancy-snippet-name");
  });

  it("trims leading and trailing dashes", () => {
    expect(normalizeSlug("--Example--")).toEqual("example");
  });

  it("throws on empty input", () => {
    expect(() => normalizeSlug("   ")).toThrow();
  });
});
