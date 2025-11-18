ALTER TABLE `users` MODIFY COLUMN `role` enum('admin','editor','viewer') NOT NULL DEFAULT 'viewer';--> statement-breakpoint
ALTER TABLE `users` ADD `isExaminee` int DEFAULT 0 NOT NULL;