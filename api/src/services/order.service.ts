import { randomBytes } from "crypto";
import { eq, and, lt } from "drizzle-orm";
import { db } from "../db";
import { orders } from "../db/schema";
import type {
    Order,
    OrderStatus,
    CreateOrderRequest,
    CreateOrderResponse,
    GetOrderStatusResponse,
    ReleaseOrderResponse,
} from "../interfaces";
import { OrderStatus as OrderStatusEnum } from "../interfaces";

/**
 * Service to manage orders in the escrow system
 * Uses Drizzle ORM with PostgreSQL for data persistence
 */
export default class OrderService {
    private escrowAddress: string;

    constructor(escrowAddress: string) {
        this.escrowAddress = escrowAddress;
    }

    /**
     * Generate a unique order ID
     */
    private generateOrderId(): string {
        const prefix = "ODR";
        const randomHex = randomBytes(8).toString("hex");
        return `${prefix}-${randomHex}`;
    }

    /**
     * Convert USD amount to PYUSD Wei (10^6)
     */
    private usdToWei(amount: number): bigint {
        return BigInt(Math.floor(amount * 1_000_000));
    }

    /**
     * Create a new order
     */
    public async createOrder(
        request: CreateOrderRequest
    ): Promise<CreateOrderResponse> {
        const orderId = this.generateOrderId();
        const amountPyusd = this.usdToWei(request.amount);

        await db.insert(orders).values({
            orderId,
            vendorAddress: request.vendor_wallet_address,
            amount: request.amount.toString(),
            amountPyusd: amountPyusd.toString(),
            ...(request.description && { description: request.description }),
            ...(request.client_id && { clientId: request.client_id }),
            status: "CREATED",
            escrowAddress: this.escrowAddress,
        });

        return {
            order_id: orderId,
            vendor_address: request.vendor_wallet_address,
            escrow_address: this.escrowAddress,
            amount_pyusd: amountPyusd.toString(),
            status: OrderStatusEnum.CREATED,
        };
    }

    /**
     * Get order status by ID
     */
    public async getOrderStatus(orderId: string): Promise<GetOrderStatusResponse | null> {
        const result = await db.select().from(orders).where(eq(orders.orderId, orderId));

        if (result.length === 0) {
            return null;
        }

        const order = result[0]!;
        return {
            order_id: order.orderId,
            status: order.status as OrderStatus,
            ...(order.txHash && { tx_hash: order.txHash }),
            ...(order.buyerAddress && { buyer_address: order.buyerAddress }),
            timestamp: order.updatedAt.toISOString(),
        };
    }

    /**
     * Get order by ID
     */
    public async getOrder(orderId: string): Promise<Order | null> {
        const result = await db.select().from(orders).where(eq(orders.orderId, orderId));

        if (result.length === 0) {
            return null;
        }

        const dbOrder = result[0]!;
        return {
            order_id: dbOrder.orderId,
            vendor_address: dbOrder.vendorAddress,
            amount: parseFloat(dbOrder.amount),
            amount_pyusd: BigInt(dbOrder.amountPyusd),
            ...(dbOrder.description && { description: dbOrder.description }),
            ...(dbOrder.clientId && { client_id: dbOrder.clientId }),
            status: dbOrder.status as OrderStatus,
            ...(dbOrder.buyerAddress && { buyer_address: dbOrder.buyerAddress }),
            ...(dbOrder.txHash && { tx_hash: dbOrder.txHash }),
            ...(dbOrder.releaseTxHash && { release_tx_hash: dbOrder.releaseTxHash }),
            escrow_address: dbOrder.escrowAddress,
            created_at: dbOrder.createdAt,
            updated_at: dbOrder.updatedAt,
        };
    }

    /**
     * Update order status
     */
    public async updateOrderStatus(
        orderId: string,
        status: OrderStatus,
        updates?: {
            buyerAddress?: string;
            txHash?: string;
            releaseTxHash?: string;
        }
    ): Promise<boolean> {
        const result = await db
            .update(orders)
            .set({
                status: status as any,
                updatedAt: new Date(),
                ...(updates?.buyerAddress && { buyerAddress: updates.buyerAddress }),
                ...(updates?.txHash && { txHash: updates.txHash }),
                ...(updates?.releaseTxHash && { releaseTxHash: updates.releaseTxHash }),
            })
            .where(eq(orders.orderId, orderId));

        return result.count > 0;
    }

    /**
     * Mark order as funded (called by blockchain indexer)
     */
    public async markOrderAsFunded(
        orderId: string,
        buyerAddress: string,
        txHash: string
    ): Promise<boolean> {
        return this.updateOrderStatus(orderId, OrderStatusEnum.FUNDED, {
            buyerAddress,
            txHash,
        });
    }

    /**
     * Mark order as release pending
     */
    public async markOrderAsReleasePending(
        orderId: string,
        releaseTxHash: string
    ): Promise<ReleaseOrderResponse | null> {
        const order = await this.getOrder(orderId);

        if (!order) {
            return null;
        }

        if (order.status !== OrderStatusEnum.FUNDED) {
            throw new Error(
                `Order ${orderId} is not in FUNDED status. Current status: ${order.status}`
            );
        }

        await this.updateOrderStatus(orderId, OrderStatusEnum.RELEASE_PENDING, {
            releaseTxHash,
        });

        return {
            order_id: orderId,
            status: OrderStatusEnum.RELEASE_PENDING,
            release_tx_hash: releaseTxHash,
        };
    }

    /**
     * Mark order as released (called by blockchain indexer after confirmation)
     */
    public async markOrderAsReleased(orderId: string): Promise<boolean> {
        return this.updateOrderStatus(orderId, OrderStatusEnum.RELEASED);
    }

    /**
     * Find pending order by amount and time window
     * Used by the indexer to match blockchain transfers to orders
     */
    public async findPendingOrderByAmount(
        amount: bigint,
        timeWindowMinutes: number = 30
    ): Promise<Order | null> {
        const now = new Date();
        const timeLimit = new Date(now.getTime() - timeWindowMinutes * 60 * 1000);

        const result = await db
            .select()
            .from(orders)
            .where(
                and(
                    eq(orders.status, "CREATED"),
                    eq(orders.amountPyusd, amount.toString()),
                    lt(orders.createdAt, timeLimit)
                )
            )
            .limit(1);

        if (result.length === 0) {
            return null;
        }

        const dbOrder = result[0]!;
        return {
            order_id: dbOrder.orderId,
            vendor_address: dbOrder.vendorAddress,
            amount: parseFloat(dbOrder.amount),
            amount_pyusd: BigInt(dbOrder.amountPyusd),
            ...(dbOrder.description && { description: dbOrder.description }),
            ...(dbOrder.clientId && { client_id: dbOrder.clientId }),
            status: dbOrder.status as OrderStatus,
            ...(dbOrder.buyerAddress && { buyer_address: dbOrder.buyerAddress }),
            ...(dbOrder.txHash && { tx_hash: dbOrder.txHash }),
            ...(dbOrder.releaseTxHash && { release_tx_hash: dbOrder.releaseTxHash }),
            escrow_address: dbOrder.escrowAddress,
            created_at: dbOrder.createdAt,
            updated_at: dbOrder.updatedAt,
        };
    }

    /**
     * Get all orders (for debugging/admin purposes)
     */
    public async getAllOrders(): Promise<Order[]> {
        const result = await db.select().from(orders);

        return result.map(dbOrder => ({
            order_id: dbOrder.orderId,
            vendor_address: dbOrder.vendorAddress,
            amount: parseFloat(dbOrder.amount),
            amount_pyusd: BigInt(dbOrder.amountPyusd),
            ...(dbOrder.description && { description: dbOrder.description }),
            ...(dbOrder.clientId && { client_id: dbOrder.clientId }),
            status: dbOrder.status as OrderStatus,
            ...(dbOrder.buyerAddress && { buyer_address: dbOrder.buyerAddress }),
            ...(dbOrder.txHash && { tx_hash: dbOrder.txHash }),
            ...(dbOrder.releaseTxHash && { release_tx_hash: dbOrder.releaseTxHash }),
            escrow_address: dbOrder.escrowAddress,
            created_at: dbOrder.createdAt,
            updated_at: dbOrder.updatedAt,
        }));
    }
}
