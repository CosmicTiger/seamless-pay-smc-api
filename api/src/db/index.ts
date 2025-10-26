import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
import appConfig from "../core/config/app.config";

const connectionString = 
    process.env.DATABASE_URL ||
    `postgresql://${appConfig.database.user}:${appConfig.database.password}@${appConfig.database.host}:${appConfig.database.port}/${appConfig.database.name}?sslmode=require`;

const client = postgres(connectionString, {
    max: appConfig.database.maxConnections,
    idle_timeout: 20,
    connect_timeout: 10,
});

export const db = drizzle(client, { schema });

export { schema };
