"use client";

import { useEffect } from "react";
import { clientLogger } from "@/src/lib/client-logger";

/**
 * Client-side global handler for unhandled promise rejections.
 * Renders nothing — just sets up the event listener.
 */
export function GlobalErrorHandler() {
  useEffect(() => {
    function handleUnhandledRejection(event: PromiseRejectionEvent) {
      clientLogger.error("Unhandled promise rejection", {
        reason:
          event.reason instanceof Error
            ? { message: event.reason.message, stack: event.reason.stack }
            : String(event.reason),
      });
    }

    window.addEventListener("unhandledrejection", handleUnhandledRejection);
    return () =>
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
  }, []);

  return null;
}
