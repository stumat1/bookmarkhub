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

## Architecture

This is a Next.js 16 project using the App Router with the following stack:

- **Framework**: Next.js 16 with App Router (`app/` directory)
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS v4
- **Database**: Drizzle ORM with better-sqlite3
- **UI Icons**: Lucide React

### Path Aliases

- `@/*` maps to the project root (e.g., `@/app/page`)

### Database

- Schema defined in `db/schema.ts`
- Database connection in `db/index.ts`
- Uses SQLite file `sqlite.db` in project root

### API Routes

- `GET /api/bookmarks` - List bookmarks with pagination
- `POST /api/bookmarks` - Create a bookmark
- `PUT /api/bookmarks/[id]` - Update a bookmark
- `DELETE /api/bookmarks/[id]` - Delete a bookmark
- `GET /api/export` - Redirects to `/export` page
- `POST /api/export` - Export bookmarks to Netscape HTML format (accepts `{ ids: number[] | "all" }`)

### Components

Located in `src/components/`:

- **EditBookmarkModal** - Modal for editing bookmarks with fields for title, URL, folder, tags, and notes. Includes form validation, loading states, and success/error notifications. Props: `bookmark`, `isOpen`, `onClose`, `onSave`
- **BookmarkUploader** - Drag-and-drop file uploader for importing bookmark HTML files
- **FolderTree** - Displays bookmark folder hierarchy
- **Nav** - Navigation component
- **ThemeToggle** - Dark/light mode toggle
