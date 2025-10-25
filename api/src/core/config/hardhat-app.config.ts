import dotenv from "dotenv";

dotenv.config();

interface HardhatConfig {
    id: number;
    name: string;
    nativeCurrency: {
        name: string;
        symbol: string;
        decimals: number;
    };
    rpcUrls: {
        default: {
            http: string[];
        };
    };
    contractsDir: string;
}

const hardhatAppConfig: HardhatConfig = {
    id: Number(process.env.HARDHAT_CHAIN_ID) || 31337,
    name: process.env.HARDHAT_CHAIN_NAME || "Hardhat",
    nativeCurrency: {
        name: process.env.HARDHAT_NATIVE_CURRENCY_NAME || "Ether",
        symbol: process.env.HARDHAT_NATIVE_CURRENCY_SYMBOL || "ETH",
        decimals: Number(process.env.HARDHAT_NATIVE_CURRENCY_DECIMALS) || 18,
    },
    rpcUrls: {
        default: {
            http: [process.env.RPC_HTTP_LOCAL! || "http://localhost:8545"],
        },
    },
    contractsDir: process.env.CONTRACTS_DIR || "../contracts",
};

export default hardhatAppConfig;
