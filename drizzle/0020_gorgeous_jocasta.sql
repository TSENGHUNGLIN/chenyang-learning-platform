CREATE TABLE `examReminders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`assignmentId` int NOT NULL,
	`reminderType` enum('3days','1day','today') NOT NULL,
	`sentAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `examReminders_id` PRIMARY KEY(`id`)
);
