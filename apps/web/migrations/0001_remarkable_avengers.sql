ALTER TABLE `user` ADD `telegramId` text;--> statement-breakpoint
CREATE INDEX `users_email_idx` ON `user` (`email`);--> statement-breakpoint
CREATE INDEX `users_telegram_idx` ON `user` (`telegramId`);--> statement-breakpoint
CREATE INDEX `users_id_idx` ON `user` (`id`);