ALTER TABLE `orders` ADD COLUMN `customer_id` text;
--> statement-breakpoint
CREATE INDEX `orders_customer_created_idx` ON `orders` (`customer_id`,`created_at`);
