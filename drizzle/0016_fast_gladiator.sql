ALTER TABLE `analysisHistory` ADD `resultHash` varchar(32);--> statement-breakpoint
ALTER TABLE `analysisHistory` ADD `qualityScore` int;--> statement-breakpoint
ALTER TABLE `analysisHistory` ADD `userFeedback` text;