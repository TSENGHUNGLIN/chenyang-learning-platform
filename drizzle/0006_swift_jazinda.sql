CREATE TABLE `assessmentRecords` (
	`id` int AUTO_INCREMENT NOT NULL,
	`employeeId` int NOT NULL,
	`analysisType` varchar(50) NOT NULL,
	`score` int,
	`result` text NOT NULL,
	`fileIds` text,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `assessmentRecords_id` PRIMARY KEY(`id`)
);
