# Cleanup TODO - Single-User Local App Streamlining

## Remove

- [x] **Rate limiting** (`middleware.ts`) - Remove IP-based rate limiter; keep security headers only
- [x] **Rate limit constants** (`src/lib/constants.ts` lines 12-15) - `RATE_LIMIT_WINDOW_MS`, `RATE_LIMIT_MAX`, `RATE_LIMIT_CLEANUP_MS` only used by rate limiter
- [x] **Auth env vars in CI** (`.github/workflows/ci.yml` lines 43-45) - Leftover `BETTER_AUTH_SECRET` + `BETTER_AUTH_URL`
- [x] **Sitemap** (`src/app/sitemap.ts`) - SEO for search engines; `robots` already says `index: false`
- [x] **OpenGraph + Twitter meta** (`src/app/layout.tsx` lines 26-42) - Social sharing metadata not needed for local app
- [x] **401 error case** (`src/lib/api-error.ts` line 41) - Can never fire without auth

## Borderline (keep or remove)

- [x] **Security headers** (`middleware.ts`) - Kept. Low overhead, good hygiene.
- [x] **Structured JSON logger** (`src/lib/logger.ts`) - Kept. Useful for debugging.
- [x] **Dockerfile** (`Dockerfile`) - Kept. Zero cost, useful if containerizing later.
- [x] **`SITE_URL` env var** (`.env`, `.env.example`, `README.md`) - Removed. No code references remain; `metadataBase` hardcoded to `localhost:3000`.
