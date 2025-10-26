import { z } from "zod";

/**
 * Schema for creating a new order
 */
export const createOrderSchema = z.object({
    vendor_wallet_address: z
        .string()
        .regex(/^0x[a-fA-F0-9]{40}$/, "Invalid Ethereum address"),
    amount: z.number().positive("Amount must be positive"),
    description: z.string().optional(),
    client_id: z.string().optional(),
});

/**
 * Schema for order ID parameter
 */
export const orderIdParamSchema = z.object({
    orderId: z.string().min(1, "Order ID is required"),
});

/**
 * Type inference from schemas
 */
export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type OrderIdParam = z.infer<typeof orderIdParamSchema>;
