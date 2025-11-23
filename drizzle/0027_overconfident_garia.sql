CREATE TABLE `overdueNotifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`assignmentId` int NOT NULL,
	`examId` int NOT NULL,
	`userId` int NOT NULL,
	`notificationLevel` enum('day_1','day_3','day_7') NOT NULL,
	`notificationSent` int NOT NULL DEFAULT 0,
	`sentAt` timestamp,
	`overdueBy` int NOT NULL,
	`deadline` timestamp NOT NULL,
	`notificationContent` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `overdueNotifications_id` PRIMARY KEY(`id`)
);
