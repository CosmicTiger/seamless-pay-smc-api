import App from "./app";
import appConfig from "./core/config/app.config";
import { AuthController, OrderController } from "./controllers";
import { OrderService, BlockchainIndexerService } from "./services";
import AuthService from "./services/auth.service";

// Initialize services
const orderService = new OrderService(appConfig.escrow.contractAddress);
const authService = new AuthService();

// Initialize blockchain indexer
const blockchainIndexer = new BlockchainIndexerService(
    appConfig.blockchain.rpcUrl,
    appConfig.escrow.contractAddress as `0x${string}`,
    appConfig.escrow.pyusdAddress as `0x${string}`,
    orderService,
    appConfig.blockchain.chainId
);

// Start indexer if enabled
if (appConfig.indexer.enabled) {
    blockchainIndexer
        .start(appConfig.indexer.pollingIntervalMs)
        .catch((error) => {
            console.error("Failed to start blockchain indexer:", error);
        });
}

// Initialize controllers
const app = new App(
    [
        new AuthController(authService),
        new OrderController(orderService),
        // new SmartContractsController(new SmartContractsService()), TODO: Enable when ready
    ],
    appConfig.port
);

app.listen();

// Graceful shutdown
process.on("SIGINT", () => {
    console.log("\nShutting down gracefully...");
    blockchainIndexer.stop();
    process.exit(0);
});

process.on("SIGTERM", () => {
    console.log("\nShutting down gracefully...");
    blockchainIndexer.stop();
    process.exit(0);
});
