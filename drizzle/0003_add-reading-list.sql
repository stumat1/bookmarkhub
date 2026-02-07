ALTER TABLE `bookmarks` ADD `is_read_later` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `bookmarks` ADD `is_read` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `bookmarks` ADD `reading_notes` text;--> statement-breakpoint
CREATE INDEX `idx_bookmarks_read_later` ON `bookmarks` (`is_read_later`);
