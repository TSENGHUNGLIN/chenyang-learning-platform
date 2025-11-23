CREATE TABLE `wrongQuestions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`questionId` int NOT NULL,
	`wrongCount` int NOT NULL DEFAULT 1,
	`lastWrongAt` timestamp NOT NULL DEFAULT (now()),
	`isReviewed` int NOT NULL DEFAULT 0,
	`reviewedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `wrongQuestions_id` PRIMARY KEY(`id`)
);
