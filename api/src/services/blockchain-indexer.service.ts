import {
    createPublicClient,
    http,
    type Address,
    type Log,
} from "viem";
import type OrderService from "./order.service";

/**
 * Blockchain Indexer Service
 * Monitors the blockchain for PYUSD transfers to the escrow contract
 * and automatically links them to pending orders
 */
export default class BlockchainIndexerService {
    private publicClient: any; // Using any to avoid viem type conflicts
    private escrowAddress: Address;
    private pyusdAddress: Address;
    private orderService: OrderService;
    private isRunning = false;
    private pollingInterval: NodeJS.Timeout | null = null;
    private lastProcessedBlock: bigint = 0n;

    constructor(
        rpcUrl: string,
        escrowAddress: Address,
        pyusdAddress: Address,
        orderService: OrderService,
        chainId?: number
    ) {
        this.publicClient = createPublicClient({
            transport: http(rpcUrl),
            ...(chainId && { chain: { id: chainId } as any }),
        });
        this.escrowAddress = escrowAddress;
        this.pyusdAddress = pyusdAddress;
        this.orderService = orderService;
    }

    /**
     * Start the indexer
     */
    public async start(pollingIntervalMs: number = 5000): Promise<void> {
        if (this.isRunning) {
            console.log("Blockchain indexer is already running");
            return;
        }

        console.log("Starting blockchain indexer...");
        this.isRunning = true;

        // Get current block number
        this.lastProcessedBlock = await this.publicClient.getBlockNumber();
        console.log(`Starting from block: ${this.lastProcessedBlock}`);

        // Start polling
        this.pollingInterval = setInterval(async () => {
            try {
                await this.pollForTransfers();
            } catch (error) {
                console.error("Error polling for transfers:", error);
            }
        }, pollingIntervalMs);

        console.log(
            `Blockchain indexer started (polling every ${pollingIntervalMs}ms)`
        );
    }

    /**
     * Stop the indexer
     */
    public stop(): void {
        if (!this.isRunning) {
            console.log("Blockchain indexer is not running");
            return;
        }

        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
            this.pollingInterval = null;
        }

        this.isRunning = false;
        console.log("Blockchain indexer stopped");
    }

    /**
     * Poll for new PYUSD transfers to the escrow contract
     */
    private async pollForTransfers(): Promise<void> {
        const currentBlock = await this.publicClient.getBlockNumber();

        // No new blocks
        if (currentBlock <= this.lastProcessedBlock) {
            return;
        }

        console.log(
            `Checking blocks ${this.lastProcessedBlock + 1n} to ${currentBlock}`
        );

        // Get Transfer events from PYUSD contract where 'to' is the escrow address
        const logs = await this.publicClient.getLogs({
            address: this.pyusdAddress,
            event: {
                type: "event",
                name: "Transfer",
                inputs: [
                    {
                        indexed: true,
                        name: "from",
                        type: "address",
                    },
                    {
                        indexed: true,
                        name: "to",
                        type: "address",
                    },
                    {
                        indexed: false,
                        name: "value",
                        type: "uint256",
                    },
                ],
            },
            args: {
                to: this.escrowAddress,
            },
            fromBlock: this.lastProcessedBlock + 1n,
            toBlock: currentBlock,
        });

        // Process each transfer
        for (const log of logs) {
            await this.processTransfer(log);
        }

        this.lastProcessedBlock = currentBlock;
    }

    /**
     * Process a single transfer event
     */
    private async processTransfer(log: Log): Promise<void> {
        try {
            // Extract data from log
            const from = log.topics[1]; // indexed parameter 'from'
            const to = log.topics[2]; // indexed parameter 'to'
            const value = log.data; // non-indexed parameter 'value'

            if (!from || !to) {
                console.warn("Invalid transfer log (missing from/to):", log);
                return;
            }

            // Convert addresses from bytes32 to address format
            const buyerAddress = `0x${from.slice(-40)}` as Address;
            const escrowAddress = `0x${to.slice(-40)}` as Address;

            // Verify this is a transfer to our escrow
            if (
                escrowAddress.toLowerCase() !==
                this.escrowAddress.toLowerCase()
            ) {
                return;
            }

            // Parse the amount (value is in Wei for PYUSD, which uses 6 decimals)
            const amount = BigInt(value);

            console.log(
                `Detected transfer: ${amount} PYUSD from ${buyerAddress} to ${escrowAddress}`
            );
            console.log(`Transaction hash: ${log.transactionHash}`);

            // Find matching pending order
            const order = await this.orderService.findPendingOrderByAmount(amount);

            if (!order) {
                console.warn(
                    `No matching pending order found for amount: ${amount}`
                );
                return;
            }

            console.log(`Matched order: ${order.order_id}`);

            // Mark order as funded
            const success = await this.orderService.markOrderAsFunded(
                order.order_id,
                buyerAddress,
                log.transactionHash || "0x"
            );

            if (success) {
                console.log(`Order ${order.order_id} marked as FUNDED`);
            } else {
                console.error(
                    `Failed to mark order ${order.order_id} as FUNDED`
                );
            }
        } catch (error) {
            console.error("Error processing transfer:", error);
        }
    }

    /**
     * Get indexer status
     */
    public getStatus(): {
        isRunning: boolean;
        lastProcessedBlock: string;
        escrowAddress: string;
        pyusdAddress: string;
    } {
        return {
            isRunning: this.isRunning,
            lastProcessedBlock: this.lastProcessedBlock.toString(),
            escrowAddress: this.escrowAddress,
            pyusdAddress: this.pyusdAddress,
        };
    }
}
