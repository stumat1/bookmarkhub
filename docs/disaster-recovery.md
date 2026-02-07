# Disaster Recovery

## Backup Strategy

BookmarkHub uses SQLite's `.backup()` API via better-sqlite3 for safe, WAL-compatible backups.

### Running a Backup

```bash
# Local
npm run db:backup

# With custom settings
SQLITE_DB_PATH=./sqlite.db BACKUP_DIR=./backups BACKUP_RETAIN=7 npm run db:backup
```

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `SQLITE_DB_PATH` | `./sqlite.db` | Path to the source database |
| `BACKUP_DIR` | `./backups` | Directory where backups are stored |
| `BACKUP_RETAIN` | `7` | Number of backup files to retain |

### Scheduling Backups (cron)

```bash
# Every 6 hours
0 */6 * * * cd /app && node scripts/db-backup.mjs >> /var/log/bookmarkhub-backup.log 2>&1

# Daily at 2 AM
0 2 * * * cd /app && node scripts/db-backup.mjs >> /var/log/bookmarkhub-backup.log 2>&1
```

### Docker Setup

Mount volumes for both the database and backups:

```bash
docker run -d \
  -v bookmarkhub-data:/app/data \
  -v bookmarkhub-backups:/app/backups \
  -e SQLITE_DB_PATH=/app/data/sqlite.db \
  -e BACKUP_DIR=/app/backups \
  -p 3000:3000 \
  bookmarkhub
```

## Restore Procedure

### 1. Stop the application

```bash
# Docker
docker stop bookmarkhub

# Systemd
sudo systemctl stop bookmarkhub
```

### 2. Locate the backup

```bash
ls -la backups/
# Output: sqlite-2026-02-07T10-30-00-000Z.db
```

### 3. Replace the database

```bash
# Backup the current (possibly corrupt) database
cp sqlite.db sqlite.db.corrupt

# Restore from backup
cp backups/sqlite-2026-02-07T10-30-00-000Z.db sqlite.db
```

### 4. Verify the restored database

```bash
sqlite3 sqlite.db "PRAGMA integrity_check;"
# Expected output: ok

sqlite3 sqlite.db "SELECT count(*) FROM bookmarks;"
# Should show your bookmark count
```

### 5. Restart the application

```bash
# Docker
docker start bookmarkhub

# Systemd
sudo systemctl start bookmarkhub
```

### 6. Verify the application

```bash
curl http://localhost:3000/api/health
# Should return {"status":"ok","database":"connected",...}
```

## Database Optimization

Run VACUUM periodically to reclaim space from deleted records:

```bash
npm run db:vacuum
```

Schedule weekly:

```bash
# Sunday at 3 AM
0 3 * * 0 cd /app && node scripts/db-vacuum.mjs >> /var/log/bookmarkhub-vacuum.log 2>&1
```

## Monitoring

The health endpoint (`GET /api/health`) reports:

- `databaseSizeMB` - Main database file size
- `walSizeMB` - WAL file size
- `bookmarkCount` - Total bookmarks
- `totalPages` - Total database pages
- `freePages` - Free (reclaimable) pages

If `freePages` is a significant percentage of `totalPages`, run `npm run db:vacuum`.

## Offsite Backups

For offsite backup, sync the backup directory to cloud storage using tools like:

- **rclone**: `rclone sync ./backups remote:bookmarkhub-backups`
- **rsync**: `rsync -avz ./backups/ user@server:/backups/bookmarkhub/`
- **AWS CLI**: `aws s3 sync ./backups s3://my-bucket/bookmarkhub-backups/`
