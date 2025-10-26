CREATE TYPE "public"."order_status" AS ENUM('CREATED', 'FUNDED', 'RELEASED', 'REFUNDED', 'RELEASE_PENDING');--> statement-breakpoint
CREATE TABLE "orders" (
	"order_id" varchar(255) PRIMARY KEY NOT NULL,
	"vendor_address" varchar(42) NOT NULL,
	"amount" numeric(18, 2) NOT NULL,
	"amount_pyusd" varchar(78) NOT NULL,
	"description" text,
	"client_id" varchar(255),
	"status" "order_status" DEFAULT 'CREATED' NOT NULL,
	"buyer_address" varchar(42),
	"tx_hash" varchar(66),
	"release_tx_hash" varchar(66),
	"escrow_address" varchar(42) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"user_id" varchar(255) PRIMARY KEY NOT NULL,
	"wallet_address" varchar(42) NOT NULL,
	"first_name" varchar(100),
	"last_name" varchar(100),
	"email" varchar(255) NOT NULL,
	"phone_number" varchar(20),
	"has_own_business" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
