/**
 * Только миграции, без пересоздания данных. Безопасно запускать при каждом обновлении.
 *   npm run db:migrate
 */
import path from "node:path";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL не задан");
  const db = drizzle(process.env.DATABASE_URL);
  await migrate(db, { migrationsFolder: path.join(process.cwd(), "src", "db", "migrations") });
  await db.$client.end();
  console.log("Миграции применены");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
