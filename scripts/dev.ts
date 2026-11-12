/**
 * Локальная разработка одной командой: `npm run dev:local`
 *
 * 1. Поднимает настоящий PostgreSQL (пакет embedded-postgres, без Docker и установки).
 * 2. При первом запуске создаёт .env.local со случайным паролем БД (файл не попадает в git).
 * 3. Если база пустая — применяет миграции и заливает вымышленные данные,
 *    иначе только применяет новые миграции.
 * 4. Запускает `next dev`; по Ctrl+C корректно останавливает PostgreSQL.
 *    `npm run db:start` — то же, но без next dev (только база).
 */
import { spawn, spawnSync } from "node:child_process";
import { ensureDatabase, ensureEnv, isSeeded, startLocalPostgres } from "./local-pg";

const DB = "dekanat";

async function main() {
  const password = ensureEnv(DB);
  const pg = await startLocalPostgres(password);
  if (!pg.startedHere) console.log("[dev] PostgreSQL уже запущен — подключаюсь к нему");

  await ensureDatabase(password, DB);
  const script = (await isSeeded(password, DB)) ? "scripts/migrate.ts" : "scripts/setup-db.ts";
  if (script.endsWith("setup-db.ts")) console.log("[dev] база пустая — заливаю вымышленные данные…");
  const r = spawnSync("npx", ["tsx", "--env-file=.env.local", script], { stdio: "inherit", shell: true });
  if (r.status !== 0) throw new Error("Не удалось подготовить базу");

  const dbOnly = process.argv.includes("--db-only");
  const next = dbOnly ? null : spawn("npx", ["next", "dev", ...process.argv.slice(2)], { stdio: "inherit", shell: true });
  if (dbOnly) console.log("[dev] режим --db-only: работает только PostgreSQL, Ctrl+C — остановить");

  let stopping = false;
  const stop = async () => {
    if (stopping) return;
    stopping = true;
    next?.kill();
    await pg.stop();
    process.exit(0);
  };
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
  next?.on("exit", stop);
}

main().catch((e) => {
  console.error("[dev] ошибка:", e);
  process.exitCode = 1;
});
