ALTER TABLE `tags` MODIFY COLUMN `name` varchar(100) NOT NULL;--> statement-breakpoint
ALTER TABLE `tags` ADD `category` varchar(50) NOT NULL;--> statement-breakpoint
ALTER TABLE `tags` ADD `description` text;