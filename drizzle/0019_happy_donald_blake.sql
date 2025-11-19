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
