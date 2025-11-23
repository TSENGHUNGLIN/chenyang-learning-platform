CREATE TABLE `examPlanningTemplateItems` (
	`id` int AUTO_INCREMENT NOT NULL,
	`templateId` int NOT NULL,
	`examId` int NOT NULL,
	`orderIndex` int NOT NULL DEFAULT 0,
	`daysFromStart` int NOT NULL DEFAULT 0,
	`durationDays` int NOT NULL DEFAULT 7,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `examPlanningTemplateItems_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `examPlanningTemplates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(200) NOT NULL,
	`description` text,
	`category` varchar(100),
	`isPublic` int NOT NULL DEFAULT 1,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `examPlanningTemplates_id` PRIMARY KEY(`id`)
);
