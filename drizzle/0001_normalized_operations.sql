CREATE TABLE `audit_events` (
	`id` text PRIMARY KEY NOT NULL,
	`restaurant_id` text NOT NULL,
	`actor` text NOT NULL,
	`actor_role` text NOT NULL,
	`action` text NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text NOT NULL,
	`summary` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `audit_events_restaurant_created_idx` ON `audit_events` (`restaurant_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `dining_tables` (
	`id` text PRIMARY KEY NOT NULL,
	`restaurant_id` text NOT NULL,
	`code` text NOT NULL,
	`seats` integer NOT NULL,
	`status` text NOT NULL,
	`occupied_minutes` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `dining_tables_restaurant_code_idx` ON `dining_tables` (`restaurant_id`,`code`);--> statement-breakpoint
CREATE TABLE `inventory_items` (
	`id` text PRIMARY KEY NOT NULL,
	`restaurant_id` text NOT NULL,
	`name` text NOT NULL,
	`unit` text NOT NULL,
	`quantity` real NOT NULL,
	`par` real NOT NULL,
	`cost_per_unit` real NOT NULL
);
--> statement-breakpoint
CREATE INDEX `inventory_restaurant_idx` ON `inventory_items` (`restaurant_id`);--> statement-breakpoint
CREATE TABLE `inventory_movements` (
	`id` text PRIMARY KEY NOT NULL,
	`restaurant_id` text NOT NULL,
	`ingredient_id` text NOT NULL,
	`delta` real NOT NULL,
	`reason` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `inventory_movements_restaurant_created_idx` ON `inventory_movements` (`restaurant_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `menu_items` (
	`id` text PRIMARY KEY NOT NULL,
	`restaurant_id` text NOT NULL,
	`name` text NOT NULL,
	`category` text NOT NULL,
	`description` text NOT NULL,
	`price` integer NOT NULL,
	`base_prep_minutes` integer NOT NULL,
	`complexity` integer NOT NULL,
	`dietary_json` text NOT NULL,
	`allergens_json` text NOT NULL,
	`spice` text NOT NULL,
	`calories` integer NOT NULL,
	`image` text NOT NULL,
	`featured` integer NOT NULL,
	`paused` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `menu_restaurant_category_idx` ON `menu_items` (`restaurant_id`,`category`);--> statement-breakpoint
CREATE TABLE `order_items` (
	`id` text PRIMARY KEY NOT NULL,
	`order_id` text NOT NULL,
	`menu_item_id` text NOT NULL,
	`name` text NOT NULL,
	`quantity` integer NOT NULL,
	`unit_price` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `order_items_order_idx` ON `order_items` (`order_id`);--> statement-breakpoint
CREATE TABLE `order_timeline` (
	`id` text PRIMARY KEY NOT NULL,
	`order_id` text NOT NULL,
	`status` text NOT NULL,
	`actor` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `order_timeline_order_created_idx` ON `order_timeline` (`order_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `orders` (
	`id` text PRIMARY KEY NOT NULL,
	`restaurant_id` text NOT NULL,
	`number` text NOT NULL,
	`table_code` text NOT NULL,
	`guest` text NOT NULL,
	`status` text NOT NULL,
	`notes` text NOT NULL,
	`allergens_json` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`estimate_minutes` integer NOT NULL,
	`total` integer NOT NULL,
	`paid` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `orders_restaurant_number_idx` ON `orders` (`restaurant_id`,`number`);--> statement-breakpoint
CREATE INDEX `orders_restaurant_status_idx` ON `orders` (`restaurant_id`,`status`);--> statement-breakpoint
CREATE TABLE `queue_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`restaurant_id` text NOT NULL,
	`name` text NOT NULL,
	`party_size` integer NOT NULL,
	`status` text NOT NULL,
	`joined_at` text NOT NULL,
	`estimate_minutes` integer NOT NULL,
	`management_token` text
);
--> statement-breakpoint
CREATE INDEX `queue_restaurant_status_idx` ON `queue_entries` (`restaurant_id`,`status`);--> statement-breakpoint
CREATE TABLE `recipe_lines` (
	`menu_item_id` text NOT NULL,
	`ingredient_id` text NOT NULL,
	`quantity` real NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `recipe_item_ingredient_idx` ON `recipe_lines` (`menu_item_id`,`ingredient_id`);--> statement-breakpoint
CREATE TABLE `reservations` (
	`id` text PRIMARY KEY NOT NULL,
	`restaurant_id` text NOT NULL,
	`name` text NOT NULL,
	`phone` text NOT NULL,
	`party_size` integer NOT NULL,
	`date` text NOT NULL,
	`time` text NOT NULL,
	`status` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `reservations_restaurant_date_idx` ON `reservations` (`restaurant_id`,`date`);--> statement-breakpoint
CREATE TABLE `restaurant_operations` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`tagline` text NOT NULL,
	`location` text NOT NULL,
	`service_charge_percent` real NOT NULL,
	`tax_percent` real NOT NULL,
	`default_turnover_minutes` integer NOT NULL,
	`is_open` integer NOT NULL,
	`accepting_orders` integer NOT NULL,
	`last_opened_at` text NOT NULL,
	`last_closed_at` text,
	`version` integer DEFAULT 1 NOT NULL,
	`write_token` text,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `service_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`restaurant_id` text NOT NULL,
	`table_code` text NOT NULL,
	`type` text NOT NULL,
	`status` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `service_requests_restaurant_status_idx` ON `service_requests` (`restaurant_id`,`status`);--> statement-breakpoint
CREATE TABLE `staff_members` (
	`id` text PRIMARY KEY NOT NULL,
	`restaurant_id` text NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`role` text NOT NULL,
	`status` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `staff_restaurant_email_idx` ON `staff_members` (`restaurant_id`,`email`);
