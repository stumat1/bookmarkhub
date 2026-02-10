# BookmarkHub

A self-hosted bookmark manager for organizing, searching, and managing browser bookmarks. Import bookmarks from any browser, organize them into folders with tags, and access them from a clean web interface.

Built with Next.js, SQLite, and Drizzle ORM. Designed to run locally as a single-user application.

## Preview Screenshot

<img width="932" height="563" alt="bookmarkhub-screenshot-1" src="https://github.com/user-attachments/assets/8f93240e-707c-49fe-a2f2-44943de58a89" />

## Features

- **Import/Export** - Import bookmarks from any browser via HTML file (drag-and-drop). Export back to standard Netscape HTML format.
- **Organization** - Folder hierarchy, tags, and notes on any bookmark.
- **Search** - Full-text search with advanced query syntax across titles, URLs, tags, and notes.
- **Reading List** - Save bookmarks to read later.
- **Keyboard Shortcuts** - Navigate and manage bookmarks without touching the mouse.
- **Dark/Light Mode** - Theme toggle with system preference detection.
- **Database Backups** - Built-in SQLite backup and optimization scripts.

## Requirements

- Node.js 20+
- npm

## Quick Start

1. Clone the repository:

```
git clone https://github.com/your-username/bookmarkhub.git
cd bookmarkhub
```

2. Install dependencies:

```
npm install
```

3. Set up environment variables:

```
cp .env.example .env
```

4. Push the database schema:

```
npm run db:push
```

5. Start the development server:

```
npm run dev
```

6. Open http://localhost:3000.

## Docker

Build and run with Docker:

```
docker build -t bookmarkhub .
docker run -d \
  -p 3000:3000 \
  -v bookmarkhub-data:/app/data \
  bookmarkhub
```

The SQLite database is stored in `/app/data` inside the container. Mount a volume to persist data across restarts.

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `SQLITE_DB_PATH` | No | `./sqlite.db` | Path to SQLite database file |
| `BACKUP_DIR` | No | `./backups` | Directory for database backups |
| `BACKUP_RETAIN` | No | `7` | Number of backup files to keep |

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm test` | Run tests |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:coverage` | Run tests with coverage report |
| `npm run db:push` | Push schema to database (development) |
| `npm run db:generate` | Generate migrations from schema changes |
| `npm run db:migrate` | Run database migrations |
| `npm run db:studio` | Open Drizzle Studio database GUI |
| `npm run db:backup` | Back up the SQLite database |
| `npm run db:vacuum` | Run VACUUM and ANALYZE on the database |

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript (strict mode)
- **Database**: SQLite via Drizzle ORM + better-sqlite3
- **Styling**: Tailwind CSS v4
- **Testing**: Vitest
- **Icons**: Lucide React

## License

MIT
