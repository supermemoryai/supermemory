ALTER TABLE `chatThread` ADD `createdAt` integer;
UPDATE `chatThread` SET `createdAt` = strftime('%s', 'now') WHERE `createdAt` IS NULL;
