ALTER TABLE `card_notes` ADD `updated_at` text NOT NULL DEFAULT '1970-01-01T00:00:00.000Z';--> statement-breakpoint
ALTER TABLE `card_progress` ADD `updated_at` text NOT NULL DEFAULT '1970-01-01T00:00:00.000Z';--> statement-breakpoint
ALTER TABLE `cards` ADD `updated_at` text NOT NULL DEFAULT '1970-01-01T00:00:00.000Z';--> statement-breakpoint
ALTER TABLE `study_sessions` ADD `updated_at` text NOT NULL DEFAULT '1970-01-01T00:00:00.000Z';--> statement-breakpoint
ALTER TABLE `study_texts` ADD `updated_at` text NOT NULL DEFAULT '1970-01-01T00:00:00.000Z';
