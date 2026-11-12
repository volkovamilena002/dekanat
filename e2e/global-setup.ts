import { spawnSync } from "node:child_process";
import { ensureDatabase, ensureEnv, localUrl, startLocalPostgres } from "../scripts/local-pg";

const E2E_DB = "dekanat_e2e";

/**
 * Перед прогоном: поднять локальный PostgreSQL (если не запущен) и заново заполнить
 * тестовую базу вымышленными данными. Возвращает функцию, которая остановит PostgreSQL
 * после тестов — только если его запускали мы.
 */
export default async function globalSetup() {
  const password = ensureEnv();
  const pg = await startLocalPostgres(password);
  await ensureDatabase(password, E2E_DB);
  const r = spawnSync("npx", ["tsx", "scripts/setup-db.ts"], {
    stdio: "inherit",
    shell: true,
    env: { ...process.env, DATABASE_URL: localUrl(password, E2E_DB) },
  });
  if (r.status !== 0) throw new Error("Не удалось заполнить тестовую базу");
  return async () => {
    await pg.stop();
  };
}
