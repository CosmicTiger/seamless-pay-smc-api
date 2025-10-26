import type { Request, Response, NextFunction } from "express";
import BaseController from "./base.controller";
import type { OrderService } from "../services";
import { createOrderSchema, orderIdParamSchema } from "../schemas";
import { StatusCodes } from "http-status-codes";

/**
 * Order Controller
 * Handles all order-related endpoints for the escrow system
 */
export default class OrderController extends BaseController {
    private orderService: OrderService;

    constructor(orderService: OrderService) {
        super("/orders");
        this.orderService = orderService;
        // Bind handlers so `this` refers to the controller instance when Express invokes them
        this.createOrder = this.createOrder.bind(this);
        this.getOrderStatus = this.getOrderStatus.bind(this);
        this.releaseOrder = this.releaseOrder.bind(this);
    }

    protected initializeRoutes(): void {
        // POST /api/v1/orders - Create a new order
        this.router.post("/", this.createOrder);

        // GET /api/v1/orders/:orderId - Get order status
        this.router.get("/:orderId", this.getOrderStatus);

        // POST /api/v1/orders/:orderId/release - Release order funds
        this.router.post("/:orderId/release", this.releaseOrder);
    }

    /**
     * POST /api/v1/orders
     * Create a new order
     */
    private async createOrder(
        req: Request,
        res: Response,
        next: NextFunction
    ): Promise<void> {
        try {
            // Validate request body
            const validatedData = createOrderSchema.parse(req.body);

            // Create order
            const order = await this.orderService.createOrder(validatedData);

            res.status(StatusCodes.CREATED).json(order);
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /api/v1/orders/:orderId
     * Get order status
     */
    private async getOrderStatus(
        req: Request,
        res: Response,
        next: NextFunction
    ): Promise<void> {
        try {
            // Validate params
            const { orderId } = orderIdParamSchema.parse(req.params);

            // Get order status
            const orderStatus = await this.orderService.getOrderStatus(orderId);

            if (!orderStatus) {
                res.status(StatusCodes.NOT_FOUND).json({
                    error: "Order not found",
                    order_id: orderId,
                });
                return;
            }

            res.status(StatusCodes.OK).json(orderStatus);
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /api/v1/orders/:orderId/release
     * Release order funds
     */
    private async releaseOrder(
        req: Request,
        res: Response,
        next: NextFunction
    ): Promise<void> {
        try {
            // Validate params
            const { orderId } = orderIdParamSchema.parse(req.params);

            // Get order
            const order = await this.orderService.getOrder(orderId);

            if (!order) {
                res.status(StatusCodes.NOT_FOUND).json({
                    error: "Order not found",
                    order_id: orderId,
                });
                return;
            }

            // Check if order is funded
            if (order.status !== "FUNDED") {
                res.status(StatusCodes.BAD_REQUEST).json({
                    error: `Order is not in FUNDED status. Current status: ${order.status}`,
                    order_id: orderId,
                    status: order.status,
                });
                return;
            }

            // TODO: Call smart contract to release funds
            // For now, we'll simulate the transaction hash
            const mockTxHash = `0x${Math.random()
                .toString(16)
                .substring(2, 66)}`;

            // Mark order as release pending
            const result = await this.orderService.markOrderAsReleasePending(
                orderId,
                mockTxHash
            );

            if (!result) {
                res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
                    error: "Failed to release order",
                    order_id: orderId,
                });
                return;
            }

            res.status(StatusCodes.OK).json(result);
        } catch (error) {
            next(error);
        }
    }
}
