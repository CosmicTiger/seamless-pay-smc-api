/**
 * Order status enum
 */
export enum OrderStatus {
    CREATED = "CREATED",
    FUNDED = "FUNDED",
    RELEASED = "RELEASED",
    REFUNDED = "REFUNDED",
    RELEASE_PENDING = "RELEASE_PENDING",
}

/**
 * Order interface representing a payment order in the escrow system
 */
export interface Order {
    order_id: string;
    vendor_address: string;
    amount: number; // Amount in USD/PYUSD (float)
    amount_pyusd: bigint; // Amount in Wei (10^6 for PYUSD)
    description?: string | undefined;
    client_id?: string | undefined;
    status: OrderStatus;
    buyer_address?: string | undefined;
    tx_hash?: string | undefined;
    release_tx_hash?: string | undefined;
    escrow_address: string;
    created_at: Date;
    updated_at: Date;
}

/**
 * Create order request payload
 */
export interface CreateOrderRequest {
    vendor_wallet_address: string;
    amount: number;
    description?: string | undefined;
    client_id?: string | undefined;
}

/**
 * Create order response
 */
export interface CreateOrderResponse {
    order_id: string;
    vendor_address: string;
    escrow_address: string;
    amount_pyusd: string; // Return as string to avoid precision issues
    status: OrderStatus;
}

/**
 * Get order status response
 */
export interface GetOrderStatusResponse {
    order_id: string;
    status: OrderStatus;
    tx_hash?: string | undefined;
    buyer_address?: string | undefined;
    timestamp: string;
}

/**
 * Release order response
 */
export interface ReleaseOrderResponse {
    order_id: string;
    status: OrderStatus;
    release_tx_hash?: string | undefined;
}
