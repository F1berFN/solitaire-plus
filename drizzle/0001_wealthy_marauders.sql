CREATE TABLE `daily_challenge_entries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`challengeId` int NOT NULL,
	`score` int NOT NULL DEFAULT 0,
	`durationSecs` int NOT NULL DEFAULT 0,
	`moves` int NOT NULL DEFAULT 0,
	`hintsUsed` int NOT NULL DEFAULT 0,
	`won` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `daily_challenge_entries_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `daily_challenges` (
	`id` int AUTO_INCREMENT NOT NULL,
	`date` varchar(10) NOT NULL,
	`seed` varchar(64) NOT NULL,
	`drawMode` enum('draw1','draw3') NOT NULL DEFAULT 'draw1',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `daily_challenges_id` PRIMARY KEY(`id`),
	CONSTRAINT `daily_challenges_date_unique` UNIQUE(`date`)
);
--> statement-breakpoint
CREATE TABLE `games` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`mode` enum('solo','vsAI','vsPlayer','daily') NOT NULL,
	`drawMode` enum('draw1','draw3') NOT NULL DEFAULT 'draw1',
	`seed` varchar(64) NOT NULL,
	`score` int NOT NULL DEFAULT 0,
	`durationSecs` int NOT NULL DEFAULT 0,
	`moves` int NOT NULL DEFAULT 0,
	`hintsUsed` int NOT NULL DEFAULT 0,
	`won` boolean NOT NULL DEFAULT false,
	`theme` varchar(32) NOT NULL DEFAULT 'classic',
	`aiDifficulty` enum('easy','medium','hard'),
	`aiScore` int,
	`opponentId` int,
	`opponentScore` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `games_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `multiplayer_rooms` (
	`id` int AUTO_INCREMENT NOT NULL,
	`code` varchar(8) NOT NULL,
	`hostId` int NOT NULL,
	`guestId` int,
	`seed` varchar(64) NOT NULL,
	`drawMode` enum('draw1','draw3') NOT NULL DEFAULT 'draw1',
	`status` enum('waiting','playing','finished') NOT NULL DEFAULT 'waiting',
	`hostScore` int,
	`guestScore` int,
	`hostWon` boolean,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`finishedAt` timestamp,
	CONSTRAINT `multiplayer_rooms_id` PRIMARY KEY(`id`),
	CONSTRAINT `multiplayer_rooms_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `user_achievements` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`achievementKey` varchar(64) NOT NULL,
	`unlockedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `user_achievements_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `user_stats` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`gamesPlayed` int NOT NULL DEFAULT 0,
	`gamesWon` int NOT NULL DEFAULT 0,
	`bestScore` int NOT NULL DEFAULT 0,
	`totalTimeSecs` int NOT NULL DEFAULT 0,
	`currentStreak` int NOT NULL DEFAULT 0,
	`bestStreak` int NOT NULL DEFAULT 0,
	`totalHintsUsed` int NOT NULL DEFAULT 0,
	`theme` varchar(32) NOT NULL DEFAULT 'classic',
	`cardBack` varchar(32) NOT NULL DEFAULT 'default',
	`drawMode` enum('draw1','draw3') NOT NULL DEFAULT 'draw1',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `user_stats_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_stats_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE INDEX `dce_userId_idx` ON `daily_challenge_entries` (`userId`);--> statement-breakpoint
CREATE INDEX `dce_challengeId_idx` ON `daily_challenge_entries` (`challengeId`);--> statement-breakpoint
CREATE INDEX `games_userId_idx` ON `games` (`userId`);--> statement-breakpoint
CREATE INDEX `games_mode_idx` ON `games` (`mode`);--> statement-breakpoint
CREATE INDEX `ua_userId_idx` ON `user_achievements` (`userId`);