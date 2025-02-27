import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { configDotenv } from 'dotenv';

configDotenv();


const queryClient = postgres(process.env.DATABASE_URL);
export const db = drizzle({ client: queryClient });
