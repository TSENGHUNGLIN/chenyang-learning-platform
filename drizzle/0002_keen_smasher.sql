CREATE TABLE `fileReadLogs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`fileId` int NOT NULL,
	`userId` int NOT NULL,
	`readAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `fileReadLogs_id` PRIMARY KEY(`id`)
);
