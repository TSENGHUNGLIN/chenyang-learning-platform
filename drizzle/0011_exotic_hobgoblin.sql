ALTER TABLE `users` MODIFY COLUMN `role` enum('admin','editor','viewer','examinee') NOT NULL DEFAULT 'examinee';--> statement-breakpoint
ALTER TABLE `users` DROP COLUMN `isExaminee`;