import dotenv from "dotenv";

dotenv.config();

interface Config {
    port: number;
    nodeEnv: string;
    logLevel: "fatal" | "error" | "warn" | "info" | "debug" | "trace";
}

const appConfig: Config = {
    port: Number(process.env.PORT) || 3000,
    nodeEnv: process.env.NODE_ENV || "development",
    logLevel: (process.env.LOG_LEVEL as Config["logLevel"]) || "info",
};

export default appConfig;
