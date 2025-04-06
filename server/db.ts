import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../shared/schema";

// Create connection
export const connection = postgres(process.env.DATABASE_URL!);

// Create database instance with all schema tables registered
export const db = drizzle(connection, { schema });