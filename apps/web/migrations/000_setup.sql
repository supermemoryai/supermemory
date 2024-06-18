CREATE TABLE `account` (
	`userId` text NOT NULL,
	`type` text NOT NULL,
	`provider` text NOT NULL,
	`providerAccountId` text NOT NULL,
	`refresh_token` text,
	`access_token` text,
	`expires_at` integer,
	`token_type` text,
	`scope` text,
	`id_token` text,
	`session_state` text,
	PRIMARY KEY(`provider`, `providerAccountId`),
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `authenticator` (
	`credentialID` text NOT NULL,
	`userId` text NOT NULL,
	`providerAccountId` text NOT NULL,
	`credentialPublicKey` text NOT NULL,
	`counter` integer NOT NULL,
	`credentialDeviceType` text NOT NULL,
	`credentialBackedUp` integer NOT NULL,
	`transports` text,
	PRIMARY KEY(`credentialID`, `userId`),
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
	`sessionToken` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
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
	`user` integer,
	FOREIGN KEY (`user`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `user` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text,
	`email` text NOT NULL,
	`emailVerified` integer,
	`image` text
);
--> statement-breakpoint
CREATE TABLE `verificationToken` (
	`identifier` text NOT NULL,
	`token` text NOT NULL,
	`expires` integer NOT NULL,
	PRIMARY KEY(`identifier`, `token`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `authenticator_credentialID_unique` ON `authenticator` (`credentialID`);--> statement-breakpoint
CREATE UNIQUE INDEX `space_name_unique` ON `space` (`name`);--> statement-breakpoint
CREATE INDEX `spaces_name_idx` ON `space` (`name`);--> statement-breakpoint
CREATE INDEX `spaces_user_idx` ON `space` (`user`);--> statement-breakpoint
CREATE INDEX `storedContent_url_idx` ON `storedContent` (`url`);--> statement-breakpoint
CREATE INDEX `storedContent_savedAt_idx` ON `storedContent` (`savedAt`);--> statement-breakpoint
CREATE INDEX `storedContent_title_idx` ON `storedContent` (`title`);--> statement-breakpoint
CREATE INDEX `storedContent_user_idx` ON `storedContent` (`user`);