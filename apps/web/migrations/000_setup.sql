CREATE TABLE `account` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`userId` text(255) NOT NULL,
	`type` text(255) NOT NULL,
	`provider` text(255) NOT NULL,
	`providerAccountId` text(255) NOT NULL,
	`refresh_token` text,
	`access_token` text,
	`expires_at` integer,
	`token_type` text(255),
	`scope` text(255),
	`id_token` text,
	`session_state` text(255),
	`oauth_token_secret` text,
	`oauth_token` text,
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `contentToSpace` (
	`contentId` integer NOT NULL,
	`spaceId` integer NOT NULL,
	PRIMARY KEY(`contentId`, `spaceId`),
	FOREIGN KEY (`contentId`) REFERENCES `storedContent`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`spaceId`) REFERENCES `space`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `session` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`sessionToken` text(255) NOT NULL,
	`userId` text(255) NOT NULL,
	`expires` integer NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `space` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text DEFAULT 'none' NOT NULL,
	`user` text(255),
	FOREIGN KEY (`user`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `storedContent` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`content` text NOT NULL,
	`title` text(255),
	`description` text(255),
	`url` text NOT NULL,
	`savedAt` integer NOT NULL,
	`baseUrl` text(255),
	`ogImage` text(255),
	`type` text DEFAULT 'page',
	`image` text(255),
	`user` text(255),
	FOREIGN KEY (`user`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `user` (
	`id` text(255) PRIMARY KEY NOT NULL,
	`name` text(255),
	`email` text(255) NOT NULL,
	`emailVerified` integer DEFAULT CURRENT_TIMESTAMP,
	`image` text(255)
);
--> statement-breakpoint
CREATE TABLE `verificationToken` (
	`identifier` text(255) NOT NULL,
	`token` text(255) NOT NULL,
	`expires` integer NOT NULL,
	PRIMARY KEY(`identifier`, `token`)
);
--> statement-breakpoint
CREATE INDEX `account_userId_idx` ON `account` (`userId`);--> statement-breakpoint
CREATE INDEX `session_userId_idx` ON `session` (`userId`);--> statement-breakpoint
CREATE UNIQUE INDEX `space_name_unique` ON `space` (`name`);--> statement-breakpoint
CREATE INDEX `spaces_name_idx` ON `space` (`name`);--> statement-breakpoint
CREATE INDEX `spaces_user_idx` ON `space` (`user`);--> statement-breakpoint
CREATE INDEX `storedContent_url_idx` ON `storedContent` (`url`);--> statement-breakpoint
CREATE INDEX `storedContent_savedAt_idx` ON `storedContent` (`savedAt`);--> statement-breakpoint
CREATE INDEX `storedContent_title_idx` ON `storedContent` (`title`);--> statement-breakpoint
CREATE INDEX `storedContent_user_idx` ON `storedContent` (`user`);