import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fetchWithRetry } from "../fetch-with-retry";

describe("fetchWithRetry", () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    mockFetch = vi.fn();
    vi.stubGlobal("fetch", mockFetch);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  function mockResponse(status: number, body?: object): Response {
    return new Response(body ? JSON.stringify(body) : null, { status });
  }

  async function runWithTimers(promise: Promise<Response>): Promise<Response> {
    // Flush all pending timers to resolve retries
    const result = promise;
    for (let i = 0; i < 10; i++) {
      await vi.advanceTimersByTimeAsync(5000);
    }
    return result;
  }

  it("returns 200 response immediately without retry", async () => {
    mockFetch.mockResolvedValueOnce(mockResponse(200, { ok: true }));

    const response = await fetchWithRetry("/api/test");

    expect(response.status).toBe(200);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("returns 4xx response without retry", async () => {
    mockFetch.mockResolvedValueOnce(mockResponse(400, { error: "Bad request" }));

    const response = await fetchWithRetry("/api/test");

    expect(response.status).toBe(400);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("returns 401 without retry", async () => {
    mockFetch.mockResolvedValueOnce(mockResponse(401));

    const response = await fetchWithRetry("/api/test");

    expect(response.status).toBe(401);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("returns 404 without retry", async () => {
    mockFetch.mockResolvedValueOnce(mockResponse(404));

    const response = await fetchWithRetry("/api/test");

    expect(response.status).toBe(404);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("retries on 500 up to maxRetries for GET", async () => {
    mockFetch
      .mockResolvedValueOnce(mockResponse(500))
      .mockResolvedValueOnce(mockResponse(500))
      .mockResolvedValueOnce(mockResponse(200, { ok: true }));

    const response = await runWithTimers(
      fetchWithRetry("/api/test", undefined, { maxRetries: 3, baseDelayMs: 100 })
    );

    expect(response.status).toBe(200);
    expect(mockFetch).toHaveBeenCalledTimes(3);
  });

  it("returns last 500 response when all retries exhausted", async () => {
    mockFetch
      .mockResolvedValueOnce(mockResponse(500))
      .mockResolvedValueOnce(mockResponse(500))
      .mockResolvedValueOnce(mockResponse(503));

    const response = await runWithTimers(
      fetchWithRetry("/api/test", undefined, { maxRetries: 2, baseDelayMs: 100 })
    );

    expect(response.status).toBe(503);
    expect(mockFetch).toHaveBeenCalledTimes(3);
  });

  it("retries on network error for GET", async () => {
    mockFetch
      .mockRejectedValueOnce(new Error("Network error"))
      .mockResolvedValueOnce(mockResponse(200, { ok: true }));

    const response = await runWithTimers(
      fetchWithRetry("/api/test", undefined, { maxRetries: 2, baseDelayMs: 100 })
    );

    expect(response.status).toBe(200);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it("throws on network error when all retries exhausted", async () => {
    vi.useRealTimers();
    mockFetch.mockImplementation(() => Promise.reject(new Error("Network error")));

    await expect(
      fetchWithRetry("/api/test", undefined, { maxRetries: 2, baseDelayMs: 1 })
    ).rejects.toThrow("Network error");

    expect(mockFetch).toHaveBeenCalledTimes(3);
    vi.useFakeTimers();
  });

  it("does not retry POST by default", async () => {
    mockFetch.mockResolvedValueOnce(mockResponse(500));

    const response = await fetchWithRetry("/api/test", { method: "POST" });

    expect(response.status).toBe(500);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("does not retry PUT by default", async () => {
    mockFetch.mockResolvedValueOnce(mockResponse(500));

    const response = await fetchWithRetry("/api/test", { method: "PUT" });

    expect(response.status).toBe(500);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("does not retry DELETE by default", async () => {
    mockFetch.mockResolvedValueOnce(mockResponse(500));

    const response = await fetchWithRetry("/api/test", { method: "DELETE" });

    expect(response.status).toBe(500);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("retries POST when retryMutations is true", async () => {
    mockFetch
      .mockResolvedValueOnce(mockResponse(500))
      .mockResolvedValueOnce(mockResponse(200, { ok: true }));

    const response = await runWithTimers(
      fetchWithRetry("/api/test", { method: "POST" }, { retryMutations: true, maxRetries: 2, baseDelayMs: 100 })
    );

    expect(response.status).toBe(200);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it("retries HEAD requests", async () => {
    mockFetch
      .mockResolvedValueOnce(mockResponse(500))
      .mockResolvedValueOnce(mockResponse(200));

    const response = await runWithTimers(
      fetchWithRetry("/api/test", { method: "HEAD" }, { maxRetries: 2, baseDelayMs: 100 })
    );

    expect(response.status).toBe(200);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it("defaults to GET when no method specified", async () => {
    mockFetch
      .mockResolvedValueOnce(mockResponse(500))
      .mockResolvedValueOnce(mockResponse(200));

    const response = await runWithTimers(
      fetchWithRetry("/api/test", undefined, { maxRetries: 1, baseDelayMs: 100 })
    );

    expect(response.status).toBe(200);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });
});
