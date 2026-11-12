import "server-only";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

export type DB = NodePgDatabase<typeof schema>;

function createDb(): DB {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL не задан. Для локальной разработки запустите `npm run dev:local` — он поднимет PostgreSQL и создаст .env.local.",
    );
  }
  const pool = new Pool({ connectionString: url, max: Number(process.env.DB_POOL_MAX ?? 10) });
  return drizzle(pool, { schema });
}

const globalForDb = globalThis as unknown as { __dekanatDb?: DB };

/**
 * Подключение создаётся лениво — при первом запросе, а не при импорте модуля.
 * Так `next build` (например, внутри Docker) проходит без доступа к базе.
 * Один пул на процесс; в dev переживает горячую перезагрузку модулей.
 */
export const db: DB = new Proxy({} as DB, {
  get(_target, prop) {
    const real = (globalForDb.__dekanatDb ??= createDb());
    const value = Reflect.get(real, prop, real);
    return typeof value === "function" ? value.bind(real) : value;
  },
});

export { schema };
