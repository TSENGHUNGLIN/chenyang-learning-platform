CREATE TABLE `questionTags` (
	`id` int AUTO_INCREMENT NOT NULL,
	`questionId` int NOT NULL,
	`tagId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `questionTags_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tags` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(50) NOT NULL,
	`color` varchar(20),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tags_id` PRIMARY KEY(`id`),
	CONSTRAINT `tags_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
ALTER TABLE `questionCategories` DROP INDEX `questionCategories_name_unique`;--> statement-breakpoint
ALTER TABLE `questionCategories` ADD `parentId` int;--> statement-breakpoint
ALTER TABLE `questions` DROP COLUMN `tags`;