-- Migration number: 0001 	 2024-08-05T18:05:16.793Z
CREATE TABLE `jobs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`userId` text NOT NULL,
	`url` text NOT NULL,
	`status` text NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`lastAttemptAt` integer,
	`error` blob,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);


CREATE INDEX `jobs_userId_idx` ON `jobs` (`userId`);--> statement-breakpoint
CREATE INDEX `jobs_status_idx` ON `jobs` (`status`);--> statement-breakpoint
CREATE INDEX `jobs_createdAt_idx` ON `jobs` (`createdAt`);--> statement-breakpoint
CREATE INDEX `jobs_url_idx` ON `jobs` (`url`);--> statement-breakpoint