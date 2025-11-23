CREATE TABLE `examPlanningBatches` (
	`id` int AUTO_INCREMENT NOT NULL,
	`batchName` varchar(200),
	`description` text,
	`totalAssignments` int NOT NULL DEFAULT 0,
	`examIds` text NOT NULL,
	`userIds` text NOT NULL,
	`importSource` enum('manual','csv','excel') NOT NULL DEFAULT 'manual',
	`importFileName` varchar(500),
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `examPlanningBatches_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `overdueExamActions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`assignmentId` int NOT NULL,
	`examId` int NOT NULL,
	`userId` int NOT NULL,
	`actionType` enum('reminder_sent','marked_overdue','makeup_scheduled','deadline_extended') NOT NULL,
	`actionDetails` text,
	`overdueBy` int,
	`originalDeadline` timestamp,
	`newDeadline` timestamp,
	`performedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `overdueExamActions_id` PRIMARY KEY(`id`)
);
