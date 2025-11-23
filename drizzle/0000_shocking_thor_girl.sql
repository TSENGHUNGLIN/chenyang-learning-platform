CREATE TABLE `analysisHistory` (
	`id` int AUTO_INCREMENT NOT NULL,
	`analysisType` varchar(50) NOT NULL,
	`analysisMode` varchar(50) NOT NULL,
	`prompt` text,
	`fileIds` text NOT NULL,
	`fileNames` text,
	`result` text NOT NULL,
	`resultHash` varchar(32),
	`qualityScore` int,
	`userFeedback` text,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `analysisHistory_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `analysisResults` (
	`id` int AUTO_INCREMENT NOT NULL,
	`fileId` int NOT NULL,
	`analysisType` varchar(50) NOT NULL,
	`result` text NOT NULL,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `analysisResults_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
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
--> statement-breakpoint
CREATE TABLE `departments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`description` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `departments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `editorDepartmentAccess` (
	`id` int AUTO_INCREMENT NOT NULL,
	`editorId` int NOT NULL,
	`departmentId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`createdBy` int NOT NULL,
	CONSTRAINT `editorDepartmentAccess_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `editorUserAccess` (
	`id` int AUTO_INCREMENT NOT NULL,
	`editorId` int NOT NULL,
	`userId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`createdBy` int NOT NULL,
	CONSTRAINT `editorUserAccess_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `employees` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`departmentId` int NOT NULL,
	`email` varchar(320),
	`phone` varchar(20),
	`position` varchar(100),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `employees_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `examAssignments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`examId` int NOT NULL,
	`userId` int NOT NULL,
	`employeeId` int,
	`assignedAt` timestamp NOT NULL DEFAULT (now()),
	`startTime` timestamp,
	`endTime` timestamp,
	`deadline` timestamp,
	`status` enum('pending','in_progress','submitted','graded') NOT NULL DEFAULT 'pending',
	`isPractice` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `examAssignments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `examQuestions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`examId` int NOT NULL,
	`questionId` int NOT NULL,
	`questionOrder` int NOT NULL,
	`points` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `examQuestions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `examReminders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`assignmentId` int NOT NULL,
	`reminderType` enum('3days','1day','today') NOT NULL,
	`sentAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `examReminders_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `examScores` (
	`id` int AUTO_INCREMENT NOT NULL,
	`assignmentId` int NOT NULL,
	`totalScore` int NOT NULL,
	`maxScore` int NOT NULL,
	`percentage` int NOT NULL,
	`passed` int NOT NULL,
	`gradedBy` int,
	`gradedAt` timestamp,
	`feedback` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `examScores_id` PRIMARY KEY(`id`),
	CONSTRAINT `examScores_assignmentId_unique` UNIQUE(`assignmentId`)
);
--> statement-breakpoint
CREATE TABLE `examSubmissions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`assignmentId` int NOT NULL,
	`questionId` int NOT NULL,
	`answer` text NOT NULL,
	`isCorrect` int,
	`score` int,
	`aiEvaluation` text,
	`teacherComment` text,
	`submittedAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `examSubmissions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
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
--> statement-breakpoint
CREATE TABLE `exams` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(200) NOT NULL,
	`description` text,
	`timeLimit` int,
	`passingScore` int NOT NULL,
	`totalScore` int NOT NULL,
	`gradingMethod` enum('auto','manual','mixed') NOT NULL DEFAULT 'auto',
	`status` enum('draft','published','archived') NOT NULL DEFAULT 'draft',
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `exams_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `fileReadLogs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`fileId` int NOT NULL,
	`userId` int NOT NULL,
	`readAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `fileReadLogs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `files` (
	`id` int AUTO_INCREMENT NOT NULL,
	`employeeId` int,
	`filename` varchar(255) NOT NULL,
	`fileKey` varchar(500) NOT NULL,
	`fileUrl` varchar(1000) NOT NULL,
	`mimeType` varchar(100) NOT NULL,
	`fileSize` int NOT NULL,
	`uploadDate` timestamp NOT NULL,
	`extractedText` text,
	`uploadedBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `files_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
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
--> statement-breakpoint
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
	`tags` text,
	`source` varchar(255),
	`questionCount` int NOT NULL DEFAULT 0,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `questionBanks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `questionCategories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`parentId` int,
	`description` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `questionCategories_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `questionTags` (
	`id` int AUTO_INCREMENT NOT NULL,
	`questionId` int NOT NULL,
	`tagId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `questionTags_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `questions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`categoryId` int,
	`type` enum('true_false','multiple_choice','short_answer') NOT NULL,
	`difficulty` enum('easy','medium','hard') NOT NULL,
	`question` text NOT NULL,
	`options` text,
	`correctAnswer` text NOT NULL,
	`explanation` text,
	`source` varchar(255),
	`isAiGenerated` int NOT NULL DEFAULT 0,
	`suggestedCategoryId` int,
	`suggestedTagIds` text,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deletedAt` timestamp,
	`deletedBy` int,
	CONSTRAINT `questions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tags` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`category` varchar(50) NOT NULL,
	`description` text,
	`color` varchar(20),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tags_id` PRIMARY KEY(`id`),
	CONSTRAINT `tags_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`openId` varchar(64) NOT NULL,
	`name` text,
	`email` varchar(320),
	`loginMethod` varchar(64),
	`role` enum('admin','editor','viewer','examinee') NOT NULL DEFAULT 'examinee',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`lastSignedIn` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_openId_unique` UNIQUE(`openId`)
);
--> statement-breakpoint
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
