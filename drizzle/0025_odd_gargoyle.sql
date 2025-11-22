CREATE TABLE `learningRecommendations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`assignmentId` int,
	`makeupExamId` int,
	`recommendationType` enum('weak_topics','practice_questions','study_materials','ai_generated') NOT NULL,
	`title` varchar(200) NOT NULL,
	`content` text NOT NULL,
	`relatedQuestionIds` text,
	`relatedCategoryIds` text,
	`relatedTagIds` text,
	`priority` enum('high','medium','low') NOT NULL DEFAULT 'medium',
	`isRead` int NOT NULL DEFAULT 0,
	`readAt` timestamp,
	`generatedBy` varchar(50) NOT NULL DEFAULT 'system',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `learningRecommendations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `makeupExams` (
	`id` int AUTO_INCREMENT NOT NULL,
	`originalAssignmentId` int NOT NULL,
	`makeupAssignmentId` int,
	`userId` int NOT NULL,
	`examId` int NOT NULL,
	`makeupCount` int NOT NULL DEFAULT 1,
	`maxMakeupAttempts` int NOT NULL DEFAULT 2,
	`makeupDeadline` timestamp,
	`status` enum('pending','scheduled','completed','expired') NOT NULL DEFAULT 'pending',
	`originalScore` int,
	`makeupScore` int,
	`reason` text,
	`notes` text,
	`scheduledBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `makeupExams_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`notificationType` enum('exam_failed','makeup_scheduled','makeup_reminder','makeup_deadline','other') NOT NULL,
	`title` varchar(200) NOT NULL,
	`content` text NOT NULL,
	`relatedExamId` int,
	`relatedAssignmentId` int,
	`relatedMakeupExamId` int,
	`isRead` int NOT NULL DEFAULT 0,
	`readAt` timestamp,
	`sentAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);
