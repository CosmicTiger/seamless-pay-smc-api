import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
import appConfig from "../core/config/app.config";

// Create postgres connection
const connectionString = `postgresql://${appConfig.database.user}:${appConfig.database.password}@${appConfig.database.host}:${appConfig.database.port}/${appConfig.database.name}`;

// Disable prefetch as it's not supported with "Transaction" pool mode
const client = postgres(connectionString, {
    max: appConfig.database.maxConnections,
    idle_timeout: 20,
    connect_timeout: 10,
});

// Create drizzle instance
export const db = drizzle(client, { schema });

// Export schema for easy access
export { schema };
