CREATE TABLE `card_progress` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`card_id` integer NOT NULL,
	`repetitions` integer DEFAULT 0 NOT NULL,
	`ease_factor` real DEFAULT 2.5 NOT NULL,
	`interval` integer DEFAULT 0 NOT NULL,
	`next_review_at` text NOT NULL,
	`last_reviewed_at` text,
	FOREIGN KEY (`card_id`) REFERENCES `cards`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `card_progress_card_id_unique` ON `card_progress` (`card_id`);--> statement-breakpoint
CREATE TABLE `cards` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`category_id` integer NOT NULL,
	`question` text NOT NULL,
	`answer` text NOT NULL,
	`acs_code` text,
	`references` text,
	`deck_type` text NOT NULL,
	`is_generated` integer DEFAULT false NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `categories` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`acs_area` text NOT NULL,
	`deck_type` text NOT NULL,
	`description` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `study_sessions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`deck_type` text NOT NULL,
	`started_at` text NOT NULL,
	`ended_at` text,
	`cards_reviewed` integer DEFAULT 0 NOT NULL,
	`cards_correct` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `study_texts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`content` text NOT NULL,
	`card_ids` text NOT NULL,
	`provider` text NOT NULL,
	`model` text NOT NULL,
	`created_at` text NOT NULL
);
