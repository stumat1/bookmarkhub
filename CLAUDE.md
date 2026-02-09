# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` - Start development server (http://localhost:3000)
- `npm run build` - Build for production
- `npm run lint` - Run ESLint
- `npm run db:generate` - Generate migrations from schema changes
- `npm run db:migrate` - Run migrations
- `npm run db:push` - Push schema directly to database (dev)
- `npm run db:studio` - Open Drizzle Studio GUI
- `npm run db:backup` - Backup SQLite database (uses `.backup()` API)
- `npm run db:vacuum` - Run VACUUM and ANALYZE on database
- `npm test` - Run tests (Vitest)
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Run tests with coverage

## Architecture

This is a Next.js 16 project using the App Router with the following stack:

- **Framework**: Next.js 16 with App Router (`app/` directory)
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS v4
- **Database**: Drizzle ORM with better-sqlite3
- **Testing**: Vitest
- **UI Icons**: Lucide React

### Path Aliases

- `@/*` maps to the project root (e.g., `@/app/page`)

### Database

- Schema defined in `db/schema.ts`
- Database connection in `db/index.ts`
- Uses SQLite file `sqlite.db` in project root

### Middleware

- `middleware.ts` - Security headers

### API Routes

- `GET /api/bookmarks` - List bookmarks with pagination
- `POST /api/bookmarks` - Create a bookmark
- `PUT /api/bookmarks/[id]` - Update a bookmark
- `DELETE /api/bookmarks/[id]` - Delete a bookmark
- `GET /api/export` - Redirects to `/export` page
- `POST /api/export` - Export bookmarks to Netscape HTML format (accepts `{ ids: number[] | "all" }`)
- `GET /api/health` - Health check with DB monitoring

### Components

Located in `src/components/`:

- **EditBookmarkModal** - Modal for editing bookmarks with fields for title, URL, folder, tags, and notes. Includes form validation, loading states, and success/error notifications. Props: `bookmark`, `isOpen`, `onClose`, `onSave`
- **BookmarkUploader** - Drag-and-drop file uploader for importing bookmark HTML files
- **FolderTree** - Displays bookmark folder hierarchy
- **Nav** - Navigation component
- **ThemeToggle** - Dark/light mode toggle
- **ErrorBoundary** - React error boundary with retry UI and dashboard link
- **GlobalErrorHandler** - Client-side unhandled promise rejection logger

### Error Handling Utilities

- `src/lib/client-logger.ts` - Client-safe structured JSON logger (for `"use client"` components)
- `src/lib/fetch-with-retry.ts` - Fetch wrapper with exponential backoff (retries GET/HEAD on 5xx/network errors)
- `src/lib/api-error.ts` - Error classification (user vs system) and friendly messages

### Instrumentation

- `instrumentation.ts` - Next.js instrumentation hook: server-side unhandled rejection logging, graceful shutdown (SIGTERM/SIGINT with DB checkpoint)

### CI/CD

- `.github/workflows/ci.yml` - GitHub Actions: lint, test, build on push/PR
