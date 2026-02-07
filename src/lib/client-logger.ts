"use client";

/**
 * Client-safe structured JSON logger.
 * Mirrors the server logger format but safe for "use client" components
 * (cannot import src/lib/logger.ts which accesses process.env at module scope).
 */

function log(
  level: string,
  message: string,
  context?: Record<string, unknown>
) {
  const entry = { level, message, timestamp: new Date().toISOString(), ...context };
  const output = JSON.stringify(entry);
  if (level === "error") console.error(output);
  else if (level === "warn") console.warn(output);
  else console.log(output);
}

export const clientLogger = {
  error: (message: string, context?: Record<string, unknown>) =>
    log("error", message, context),
  warn: (message: string, context?: Record<string, unknown>) =>
    log("warn", message, context),
  info: (message: string, context?: Record<string, unknown>) =>
    log("info", message, context),
};
