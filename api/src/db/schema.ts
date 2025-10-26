import {
    pgTable,
    varchar,
    numeric,
    timestamp,
    pgEnum,
    text,
    boolean,
} from "drizzle-orm/pg-core";

// Order status enum
export const orderStatusEnum = pgEnum("order_status", [
    "CREATED",
    "FUNDED",
    "RELEASED",
    "REFUNDED",
    "RELEASE_PENDING",
]);

// Orders table
export const orders = pgTable("orders", {
    orderId: varchar("order_id", { length: 255 }).primaryKey(),
    vendorAddress: varchar("vendor_address", { length: 42 }).notNull(),
    amount: numeric("amount", { precision: 18, scale: 2 }).notNull(),
    amountPyusd: varchar("amount_pyusd", { length: 78 }).notNull(), // Store bigint as string
    description: text("description"),
    clientId: varchar("client_id", { length: 255 }),
    status: orderStatusEnum("status").notNull().default("CREATED"),
    buyerAddress: varchar("buyer_address", { length: 42 }),
    txHash: varchar("tx_hash", { length: 66 }),
    releaseTxHash: varchar("release_tx_hash", { length: 66 }),
    escrowAddress: varchar("escrow_address", { length: 42 }).notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Users table
export const users = pgTable("users", {
    userId: varchar("user_id", { length: 255 }).primaryKey(),
    walletAddress: varchar("wallet_address", { length: 42 }).notNull(),
    firstName: varchar("first_name", { length: 100 }),
    lastName: varchar("last_name", { length: 100 }),
    email: varchar("email", { length: 255 }).notNull(),
    phoneNumber: varchar("phone_number", { length: 20 }),
    hasOwnBusiness: boolean("has_own_business").notNull().default(false),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Type inference
export type Order = typeof orders.$inferSelect;
export type NewOrder = typeof orders.$inferInsert;

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;