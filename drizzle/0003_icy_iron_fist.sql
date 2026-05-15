ALTER TABLE `guest_players` ADD `elo` int DEFAULT 1200 NOT NULL;--> statement-breakpoint
ALTER TABLE `user_stats` ADD `elo` int DEFAULT 1200 NOT NULL;