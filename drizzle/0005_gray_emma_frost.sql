ALTER TABLE `multiplayer_rooms` ADD `hostIsGuest` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `multiplayer_rooms` ADD `hostGuestPlayerId` int;--> statement-breakpoint
ALTER TABLE `multiplayer_rooms` ADD `guestIsGuest` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `multiplayer_rooms` ADD `guestGuestPlayerId` int;