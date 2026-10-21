CREATE TABLE `runs` (
	`id` text PRIMARY KEY NOT NULL,
	`profile_id` text NOT NULL,
	`duration_ms` integer NOT NULL,
	`generation` integer NOT NULL,
	`bot` integer NOT NULL,
	`died_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `runs_profile_date` ON `runs` (`profile_id`,`died_at`);