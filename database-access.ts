// Script para acesso direto ao banco de dados
import { db } from "./server/db";
import { users, companies, monitoringSessions } from "./shared/schema";

// Exemplos de queries úteis

// Ver todos os usuários
export async function getAllUsers() {
  return await db.select().from(users);
}

// Ver todas as empresas
export async function getAllCompanies() {
  return await db.select().from(companies);
}

// Ver monitorias recentes
export async function getRecentSessions() {
  return await db.select().from(monitoringSessions)
    .orderBy(monitoringSessions.createdAt)
    .limit(10);
}

// Executar query personalizada
export async function customQuery(sql: string) {
  return await db.execute(sql);
}

// Para usar: tsx database-access.ts
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log("Usuários:", await getAllUsers());
  console.log("Empresas:", await getAllCompanies());
  console.log("Sessões recentes:", await getRecentSessions());
}