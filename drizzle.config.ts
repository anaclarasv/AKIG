import { defineConfig } from "drizzle-kit";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL, ensure the database is provisioned");
}

export default defineConfig({
  schema: "./shared/schema.ts", // Caminho para seu schema Drizzle
  out: "./migrations",          // Pasta onde as migrations serão salvas
  dialect: "postgresql",        // Tipo do banco (Render usa PostgreSQL)
  dbCredentials: {
    url: process.env.DATABASE_URL, // URL pega da env do Render
  },
});
