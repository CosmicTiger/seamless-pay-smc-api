import dotenv from "dotenv";

dotenv.config();

interface Config {
    port: number;
    nodeEnv: string;
    logLevel: "fatal" | "error" | "warn" | "info" | "debug" | "trace";
    escrow: {
        contractAddress: string;
        pyusdAddress: string;
    };
    blockchain: {
        rpcUrl: string;
        chainId: number;
    };
    indexer: {
        pollingIntervalMs: number;
        enabled: boolean;
    };
    database: {
        host: string;
        port: number;
        user: string;
        password: string;
        name: string;
        maxConnections: number;
    };
}

const appConfig: Config = {
    port: Number(process.env.PORT) || 3000,
    nodeEnv: process.env.NODE_ENV || "development",
    logLevel: (process.env.LOG_LEVEL as Config["logLevel"]) || "info",
    escrow: {
        contractAddress:
            process.env.ESCROW_CONTRACT_ADDRESS ||
            "0x742d131f452C7F724D9c819890f590F8e91B33eD",
        pyusdAddress:
            process.env.PYUSD_CONTRACT_ADDRESS ||
            "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
    },
    blockchain: {
        rpcUrl:
            process.env.BLOCKCHAIN_RPC_URL || "http://127.0.0.1:8545",
        chainId: Number(process.env.CHAIN_ID) || 11155111,
    },
    indexer: {
        pollingIntervalMs:
            Number(process.env.INDEXER_POLLING_INTERVAL_MS) || 5000,
        enabled: process.env.INDEXER_ENABLED !== "false",
    },
    database: {
        host: process.env.DB_HOST || "localhost",
        port: Number(process.env.DB_PORT) || 5432,
        user: process.env.DB_USER || "postgres",
        password: process.env.DB_PASSWORD || "postgres",
        name: process.env.DB_NAME || "seamless_pay",
        maxConnections: Number(process.env.DB_MAX_CONNECTIONS) || 20,
    },
};

export default appConfig;
