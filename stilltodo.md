# Still TODO - Production Readiness Requirements

**Current Production Readiness Score: 7/10**

---

## Phase 1 - Critical (Must Fix Before Production)

### Security: Authentication & Authorization
- [ ] Implement user authentication (NextAuth.js, Clerk, or similar)
- [ ] Add per-user authorization so users can only access their own bookmarks
- [ ] Add API key management for programmatic access

### Security: Rate Limiting & CSRF
- [ ] Add rate limiting to all API routes to prevent abuse
- [ ] Add CSRF tokens to all state-changing operations (POST/PUT/DELETE)
- [ ] Add security headers middleware (CSP, X-Frame-Options, X-Content-Type-Options, etc.)
- [ ] Add CORS validation

### Testing
- [ ] Add a test framework (Vitest or Jest + Testing Library)
- [ ] Write unit tests for utility functions and validators (`bookmarkParser.ts`, `operations.ts`)
- [ ] Write integration tests for all API routes
- [ ] Add E2E tests (Playwright or Cypress) for critical user flows
- [ ] Set up test coverage reporting (target >80%)
- [ ] Add pre-commit hooks to run tests (husky + lint-staged)

### Monitoring & Error Tracking
- [ ] Add error tracking service (Sentry free tier)
- [ ] Create `/api/health` health check endpoint
- [ ] Implement structured logging (pino or winston) with log levels
- [ ] Add request logging middleware

---

## Phase 2 - High Priority

### Error Handling
- [x] Add React Error Boundary components for client-side crash recovery
- [x] Implement retry logic with exponential backoff for failed API requests
- [x] Classify errors (user errors vs system errors) and show appropriate messages
- [x] Add global handler for unhandled promise rejections

### Database Reliability
- [x] Implement automated SQLite backup strategy (to S3 or cloud storage)
- [x] Document disaster recovery / restore procedures
- [x] Add database size monitoring
- [x] Implement periodic VACUUM for database optimization

### Deployment Hardening
- [x] Add `HEALTHCHECK` directive to Dockerfile
- [x] Implement graceful shutdown (SIGTERM handler)
- [x] Create `.env.example` with all required environment variables
- [x] Set up CI/CD pipeline (GitHub Actions)

---

## Phase 3 - Medium Priority

### Code Quality
- [ ] Refactor `bookmarks/page.tsx` (3028 lines) into smaller components
- [ ] Extract magic numbers/strings into a constants file
- [ ] Deduplicate URL validation logic across files
- [ ] Add centralized config for timeouts, limits, and other settings

### SEO & Accessibility
- [ ] Add Open Graph and Twitter Card meta tags
- [ ] Add `robots.txt` and XML sitemap
- [ ] Improve ARIA labels on all interactive elements
- [ ] Add visible focus indicators for keyboard navigation
- [ ] Add alt text to image placeholders
- [ ] Implement skip-navigation links

### Performance
- [ ] Add HTTP caching headers (ETag, Cache-Control) to API responses
- [ ] Optimize the stats endpoint (currently runs multiple individual queries)
- [ ] Use Next.js Image component for favicon/thumbnail handling

---

## Phase 4 - Nice to Have

### User Experience
- [ ] Add PWA / service worker for offline support
- [ ] Add toast notification system for success/error feedback
- [ ] Implement undo for destructive operations (delete)
- [ ] Add search history
- [ ] Add drag-and-drop for bookmark organization

### Advanced Monitoring
- [ ] Add APM service (DataDog, New Relic, or similar)
- [ ] Add database query performance tracking / slow query detection
- [ ] Set up uptime monitoring
- [ ] Configure alerting rules for critical errors

---

## What's Already Good

- Drizzle ORM with parameterized queries (no SQL injection risk)
- Comprehensive database indexing and WAL mode
- Multi-stage Docker build with standalone output
- Input validation on all API endpoints
- HTML entity escaping in export (XSS prevention)
- TypeScript strict mode with clean type usage
- Dark/light theme, keyboard shortcuts, loading states, pagination
- Advanced search syntax support
