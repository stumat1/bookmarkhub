import { describe, it, expect } from "vitest";
import {
  parseBookmarkHTML,
  isValidBookmarkHTML,
  BookmarkParseError,
} from "../bookmarkParser";

const CHROME_BOOKMARKS = `<!DOCTYPE NETSCAPE-Bookmark-file-1>
<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">
<TITLE>Bookmarks</TITLE>
<H1>Bookmarks</H1>
<DL><p>
  <DT><H3 ADD_DATE="1700000000" LAST_MODIFIED="1700000000">Bookmarks Bar</H3>
  <DL><p>
    <DT><A HREF="https://example.com" ADD_DATE="1700000000">Example Site</A>
    <DT><A HREF="https://github.com" ADD_DATE="1700000001">GitHub</A>
    <DT><H3 ADD_DATE="1700000002">Dev Tools</H3>
    <DL><p>
      <DT><A HREF="https://nodejs.org" ADD_DATE="1700000003">Node.js</A>
    </DL><p>
  </DL><p>
</DL><p>`;

const FIREFOX_BOOKMARKS = `<!DOCTYPE NETSCAPE-Bookmark-file-1>
<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">
<TITLE>Bookmarks</TITLE>
<H1>Bookmarks Menu</H1>
<DL><p>
  <DT><A HREF="https://mozilla.org" ADD_DATE="1700000000" LAST_CHARSET="UTF-8" SHORTCUTURL="">Mozilla</A>
</DL><p>`;

describe("parseBookmarkHTML", () => {
  it("parses Chrome bookmark file", () => {
    const result = parseBookmarkHTML(CHROME_BOOKMARKS);
    expect(result.totalCount).toBe(3);
    expect(result.bookmarks[0].title).toBe("Example Site");
    expect(result.bookmarks[0].url).toBe("https://example.com");
    expect(result.bookmarks[1].title).toBe("GitHub");
    expect(result.bookmarks[1].url).toBe("https://github.com");
  });

  it("detects browser type from Chrome bookmarks", () => {
    const result = parseBookmarkHTML(CHROME_BOOKMARKS);
    expect(result.browserType).toBe("chrome");
  });

  it("detects browser type from Firefox bookmarks", () => {
    const result = parseBookmarkHTML(FIREFOX_BOOKMARKS);
    expect(result.browserType).toBe("firefox");
  });

  it("parses nested folder structure", () => {
    const result = parseBookmarkHTML(CHROME_BOOKMARKS);
    const nodeBookmark = result.bookmarks.find((b) => b.url === "https://nodejs.org");
    expect(nodeBookmark).toBeDefined();
    expect(nodeBookmark!.folderPath).toEqual(["Bookmarks Bar", "Dev Tools"]);
  });

  it("extracts folder information", () => {
    const result = parseBookmarkHTML(CHROME_BOOKMARKS);
    expect(result.folders.length).toBeGreaterThanOrEqual(2);
    const devTools = result.folders.find((f) => f.name === "Dev Tools");
    expect(devTools).toBeDefined();
    expect(devTools!.path).toEqual(["Bookmarks Bar", "Dev Tools"]);
  });

  it("parses date added timestamps", () => {
    const result = parseBookmarkHTML(CHROME_BOOKMARKS);
    expect(result.bookmarks[0].dateAdded).toBeInstanceOf(Date);
  });

  it("throws on empty string", () => {
    expect(() => parseBookmarkHTML("")).toThrow(BookmarkParseError);
  });

  it("throws on non-bookmark HTML", () => {
    expect(() => parseBookmarkHTML("<html><body>Hello</body></html>")).toThrow(
      BookmarkParseError
    );
  });

  it("throws on null/undefined input", () => {
    expect(() => parseBookmarkHTML(null as unknown as string)).toThrow(
      BookmarkParseError
    );
    expect(() => parseBookmarkHTML(undefined as unknown as string)).toThrow(
      BookmarkParseError
    );
  });
});

describe("isValidBookmarkHTML", () => {
  it("returns true for valid bookmark HTML", () => {
    expect(isValidBookmarkHTML(CHROME_BOOKMARKS)).toBe(true);
    expect(isValidBookmarkHTML(FIREFOX_BOOKMARKS)).toBe(true);
  });

  it("returns false for regular HTML", () => {
    expect(isValidBookmarkHTML("<html><body>Hello</body></html>")).toBe(false);
  });

  it("returns false for empty string", () => {
    expect(isValidBookmarkHTML("")).toBe(false);
  });

  it("returns false for null/undefined", () => {
    expect(isValidBookmarkHTML(null as unknown as string)).toBe(false);
    expect(isValidBookmarkHTML(undefined as unknown as string)).toBe(false);
  });
});
