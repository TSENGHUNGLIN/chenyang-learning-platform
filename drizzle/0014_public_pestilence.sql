CREATE TABLE `questionBankItems` (
	`id` int AUTO_INCREMENT NOT NULL,
	`bankId` int NOT NULL,
	`questionId` int NOT NULL,
	`order` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `questionBankItems_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `questionBanks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(200) NOT NULL,
	`description` text,
	`source` varchar(255),
	`questionCount` int NOT NULL DEFAULT 0,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `questionBanks_id` PRIMARY KEY(`id`)
);
