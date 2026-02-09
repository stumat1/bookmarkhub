export interface ApiError {
  message: string;
  details?: string[];
  /** true = 4xx (user can fix), false = 5xx (server problem) */
  isUserError: boolean;
  status: number;
}

/**
 * Parse an API response into a structured error.
 * Returns null if the response is OK.
 */
export async function parseApiError(
  response: Response
): Promise<ApiError | null> {
  if (response.ok) return null;

  const isUserError = response.status >= 400 && response.status < 500;

  try {
    const body = await response.json();
    return {
      message: body.error || response.statusText,
      details: body.details,
      isUserError,
      status: response.status,
    };
  } catch {
    return {
      message: response.statusText || "An error occurred",
      isUserError,
      status: response.status,
    };
  }
}

/**
 * Returns a user-friendly message based on error type.
 */
export function friendlyErrorMessage(error: ApiError): string {
  if (error.status === 404) return "The requested item was not found.";
  if (error.isUserError) return error.message;
  return "Something went wrong on our end. Please try again later.";
}
