CREATE TABLE `spacesAccess` (
	`spaceId` integer NOT NULL,
	`userEmail` text NOT NULL,
	PRIMARY KEY(`spaceId`, `userEmail`),
	FOREIGN KEY (`spaceId`) REFERENCES `space`(`id`) ON UPDATE no action ON DELETE cascade
);
