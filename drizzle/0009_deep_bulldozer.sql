CREATE TABLE `analysisHistory` (
	`id` int AUTO_INCREMENT NOT NULL,
	`analysisType` varchar(50) NOT NULL,
	`analysisMode` varchar(50) NOT NULL,
	`prompt` text,
	`fileIds` text NOT NULL,
	`fileNames` text,
	`result` text NOT NULL,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `analysisHistory_id` PRIMARY KEY(`id`)
);
