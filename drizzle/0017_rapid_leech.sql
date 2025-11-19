CREATE TABLE `examTemplateQuestions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`templateId` int NOT NULL,
	`questionId` int NOT NULL,
	`questionOrder` int NOT NULL,
	`points` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `examTemplateQuestions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `examTemplates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(200) NOT NULL,
	`description` text,
	`timeLimit` int,
	`passingScore` int NOT NULL,
	`gradingMethod` enum('auto','manual','mixed') NOT NULL DEFAULT 'auto',
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `examTemplates_id` PRIMARY KEY(`id`)
);
