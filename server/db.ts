// server/db.ts
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "@shared/schema";

// Verifica se a variável de ambiente está presente
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set. Did you forget to provision a database?");
}

// Cria o pool de conexão usando pg (PostgreSQL)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }, // Necessário para Render
});

// Exporta o cliente drizzle com a pool e o schema
export const db = drizzle(pool, { schema });
