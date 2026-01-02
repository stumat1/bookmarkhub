CREATE TABLE `bookmarks` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`url` text NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`favicon` text,
	`folder` text,
	`browser` text,
	`date_added` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_bookmarks_url` ON `bookmarks` (`url`);--> statement-breakpoint
CREATE INDEX `idx_bookmarks_browser` ON `bookmarks` (`browser`);--> statement-breakpoint
CREATE INDEX `idx_bookmarks_folder` ON `bookmarks` (`folder`);