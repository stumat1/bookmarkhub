interface RetryOptions {
  /** Maximum number of retries (default: 3) */
  maxRetries?: number;
  /** Base delay in ms, doubles each retry (default: 1000) */
  baseDelayMs?: number;
  /** Whether to retry non-GET/HEAD methods (default: false) */
  retryMutations?: boolean;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Fetch wrapper with exponential backoff retry.
 * - Only retries on network errors and 5xx responses
 * - Never retries 4xx (client/user errors)
 * - Only retries GET/HEAD by default (opt-in for mutations)
 * - Returns the same Response type as native fetch
 */
export async function fetchWithRetry(
  input: RequestInfo | URL,
  init?: RequestInit,
  options?: RetryOptions
): Promise<Response> {
  const { maxRetries = 3, baseDelayMs = 1000, retryMutations = false } = options ?? {};

  const method = (init?.method ?? "GET").toUpperCase();
  const canRetry = retryMutations || method === "GET" || method === "HEAD";
  const attempts = canRetry ? maxRetries + 1 : 1;

  let lastError: Error | undefined;
  let lastResponse: Response | undefined;

  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      const response = await fetch(input, init);

      // Don't retry 4xx - those are user/client errors
      if (response.status < 500) return response;

      // 5xx - retry if we have attempts left
      lastResponse = response;
      if (attempt < attempts - 1) {
        await sleep(baseDelayMs * Math.pow(2, attempt));
        continue;
      }
      return response;
    } catch (error) {
      // Network error - retry if we have attempts left
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt < attempts - 1) {
        await sleep(baseDelayMs * Math.pow(2, attempt));
        continue;
      }
    }
  }

  if (lastResponse) return lastResponse;
  throw lastError ?? new Error("Fetch failed");
}
