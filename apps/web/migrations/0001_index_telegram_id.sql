ALTER TABLE `space` ADD COLUMN `createdAt` integer;
ALTER TABLE `space` ADD COLUMN `numItems` integer NOT NULL DEFAULT 0;
--> statement-breakpoint

CREATE INDEX `users_email_idx` ON `user` (`email`);--> statement-breakpoint
CREATE INDEX `users_telegram_idx` ON `user` (`telegramId`);--> statement-breakpoint
CREATE INDEX `users_id_idx` ON `user` (`id`);
CREATE UNIQUE INDEX `storedContent_baseUrl_unique` ON `storedContent` (`baseUrl`);
ALTER TABLE `user` ADD COLUMN `telegramId` text;