import { NextRequest, NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";
import { RATE_LIMIT_WINDOW_MS, RATE_LIMIT_MAX, RATE_LIMIT_CLEANUP_MS } from "@/src/lib/constants";

// --- In-memory rate limiter ---
const requestCounts = new Map<string, { count: number; resetAt: number }>();

let lastCleanup = Date.now();
function cleanupStaleEntries() {
  const now = Date.now();
  if (now - lastCleanup < RATE_LIMIT_CLEANUP_MS) return;
  lastCleanup = now;
  for (const [key, value] of requestCounts) {
    if (now > value.resetAt) {
      requestCounts.delete(key);
    }
  }
}

function isRateLimited(ip: string): { limited: boolean; retryAfter: number } {
  cleanupStaleEntries();
  const now = Date.now();
  const entry = requestCounts.get(ip);

  if (!entry || now > entry.resetAt) {
    requestCounts.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return { limited: false, retryAfter: 0 };
  }

  entry.count++;
  if (entry.count > RATE_LIMIT_MAX) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
    return { limited: true, retryAfter };
  }

  return { limited: false, retryAfter: 0 };
}

// --- Security headers ---
const securityHeaders: Record<string, string> = {
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "X-XSS-Protection": "1; mode=block",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
};

function addSecurityHeaders(response: NextResponse): NextResponse {
  for (const [key, value] of Object.entries(securityHeaders)) {
    response.headers.set(key, value);
  }
  return response;
}

// --- Middleware ---
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip auth check for login page, auth API routes, and health endpoint
  const isPublicPath =
    pathname === "/login" ||
    pathname.startsWith("/api/auth/") ||
    pathname === "/api/health" ||
    pathname.startsWith("/_next/") ||
    pathname === "/favicon.ico";

  // Rate limit API routes (except auth, which Better Auth rate-limits itself)
  if (pathname.startsWith("/api/") && !pathname.startsWith("/api/auth/")) {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "unknown";

    const { limited, retryAfter } = isRateLimited(ip);
    if (limited) {
      const response = NextResponse.json(
        { error: "Too many requests" },
        { status: 429 }
      );
      response.headers.set("Retry-After", retryAfter.toString());
      return addSecurityHeaders(response);
    }
  }

  // Auth check for protected routes
  if (!isPublicPath) {
    const sessionCookie = getSessionCookie(request);
    if (!sessionCookie) {
      // API routes return 401, pages redirect to login
      if (pathname.startsWith("/api/")) {
        return addSecurityHeaders(
          NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        );
      }
      const loginUrl = new URL("/login", request.url);
      return addSecurityHeaders(NextResponse.redirect(loginUrl));
    }
  }

  const response = NextResponse.next();
  return addSecurityHeaders(response);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
