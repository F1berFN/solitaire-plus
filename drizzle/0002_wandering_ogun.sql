CREATE TABLE `guest_players` (
	`id` int AUTO_INCREMENT NOT NULL,
	`displayName` varchar(64) NOT NULL,
	`discriminator` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`lastSeenAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `guest_players_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `gp_displayName_idx` ON `guest_players` (`displayName`);