import { describe, it, expect } from "vitest";
import { normalizeUrl, getSimilarityKey } from "../operations";

describe("normalizeUrl", () => {
  it("removes www prefix", () => {
    expect(normalizeUrl("https://www.example.com")).toBe(
      "https://example.com/"
    );
  });

  it("lowercases the hostname", () => {
    expect(normalizeUrl("https://EXAMPLE.COM/Path")).toBe(
      "https://example.com/Path"
    );
  });

  it("removes trailing slashes from paths", () => {
    expect(normalizeUrl("https://example.com/page/")).toBe(
      "https://example.com/page"
    );
  });

  it("keeps root path as-is", () => {
    expect(normalizeUrl("https://example.com/")).toBe(
      "https://example.com/"
    );
  });

  it("strips fragment identifiers", () => {
    expect(normalizeUrl("https://example.com/page#section")).toBe(
      "https://example.com/page"
    );
  });

  it("sorts query parameters", () => {
    expect(normalizeUrl("https://example.com?b=2&a=1")).toBe(
      "https://example.com/?a=1&b=2"
    );
  });

  it("removes default port 80 for http", () => {
    expect(normalizeUrl("http://example.com:80/page")).toBe(
      "http://example.com/page"
    );
  });

  it("removes default port 443 for https", () => {
    expect(normalizeUrl("https://example.com:443/page")).toBe(
      "https://example.com/page"
    );
  });

  it("keeps non-default ports", () => {
    expect(normalizeUrl("https://example.com:8080/page")).toBe(
      "https://example.com:8080/page"
    );
  });

  it("handles invalid URLs by lowercasing", () => {
    expect(normalizeUrl("not-a-url")).toBe("not-a-url");
  });

  it("normalizes two equivalent URLs to the same value", () => {
    const url1 = "https://www.Example.COM/page/";
    const url2 = "https://example.com/page";
    expect(normalizeUrl(url1)).toBe(normalizeUrl(url2));
  });
});

describe("getSimilarityKey", () => {
  it("strips protocol", () => {
    expect(getSimilarityKey("https://example.com/page")).toBe(
      "example.com/page"
    );
    expect(getSimilarityKey("http://example.com/page")).toBe(
      "example.com/page"
    );
  });

  it("strips www prefix", () => {
    expect(getSimilarityKey("https://www.example.com/page")).toBe(
      "example.com/page"
    );
  });

  it("removes trailing slashes", () => {
    expect(getSimilarityKey("https://example.com/page/")).toBe(
      "example.com/page"
    );
  });

  it("lowercases hostname", () => {
    expect(getSimilarityKey("https://EXAMPLE.COM/page")).toBe(
      "example.com/page"
    );
  });

  it("matches http and https versions of the same URL", () => {
    expect(getSimilarityKey("http://example.com/page")).toBe(
      getSimilarityKey("https://example.com/page")
    );
  });

  it("handles invalid URLs by lowercasing", () => {
    expect(getSimilarityKey("not-a-url")).toBe("not-a-url");
  });
});
