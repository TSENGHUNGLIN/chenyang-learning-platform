ALTER TABLE `questions` ADD `isAiGenerated` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `questions` ADD `suggestedCategoryId` int;--> statement-breakpoint
ALTER TABLE `questions` ADD `suggestedTagIds` text;