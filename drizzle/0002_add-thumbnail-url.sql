ALTER TABLE `bookmarks` ADD `link_status` text DEFAULT 'unchecked';--> statement-breakpoint
ALTER TABLE `bookmarks` ADD `last_checked` integer;--> statement-breakpoint
ALTER TABLE `bookmarks` ADD `is_favorite` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `bookmarks` ADD `thumbnail_url` text;--> statement-breakpoint
CREATE INDEX `idx_bookmarks_link_status` ON `bookmarks` (`link_status`);--> statement-breakpoint
CREATE INDEX `idx_bookmarks_favorite` ON `bookmarks` (`is_favorite`);