import { describe, it, expect, vi, beforeEach } from "vitest";
import { logger } from "../logger";

describe("logger", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("logs error messages as JSON to console.error", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    logger.error("test error", { code: 500 });

    expect(spy).toHaveBeenCalledOnce();
    const logged = JSON.parse(spy.mock.calls[0][0] as string);
    expect(logged.level).toBe("error");
    expect(logged.message).toBe("test error");
    expect(logged.code).toBe(500);
    expect(logged.timestamp).toBeDefined();
  });

  it("logs warn messages as JSON to console.warn", () => {
    const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
    logger.warn("test warning");

    expect(spy).toHaveBeenCalledOnce();
    const logged = JSON.parse(spy.mock.calls[0][0] as string);
    expect(logged.level).toBe("warn");
    expect(logged.message).toBe("test warning");
  });

  it("logs info messages as JSON to console.log", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    logger.info("test info");

    expect(spy).toHaveBeenCalledOnce();
    const logged = JSON.parse(spy.mock.calls[0][0] as string);
    expect(logged.level).toBe("info");
    expect(logged.message).toBe("test info");
  });

  it("includes ISO timestamp in all log entries", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    logger.error("test");

    const logged = JSON.parse(spy.mock.calls[0][0] as string);
    expect(() => new Date(logged.timestamp)).not.toThrow();
  });

  it("merges context into log entry", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    logger.error("db failed", { table: "bookmarks", query: "SELECT" });

    const logged = JSON.parse(spy.mock.calls[0][0] as string);
    expect(logged.table).toBe("bookmarks");
    expect(logged.query).toBe("SELECT");
  });
});
