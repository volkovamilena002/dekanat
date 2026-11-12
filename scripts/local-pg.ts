/**
 * Локальный PostgreSQL через пакет embedded-postgres (без Docker и установки).
 * Используется `scripts/dev.ts` (разработка) и `e2e/global-setup.ts` (автотесты).
 */
import EmbeddedPostgres from "embedded-postgres";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import net from "node:net";
import path from "node:path";
import pg from "pg";

const ROOT = process.cwd();
const ENV_FILE = path.join(ROOT, ".env.local");
const DATA_DIR = path.join(ROOT, ".data", "postgres");
export const PG_PORT = Number(process.env.LOCAL_PG_PORT ?? 54329);

/** Пароль локальной БД из .env.local; при первом запуске создаёт файл со случайным паролем. */
export function ensureEnv(db = "dekanat") {
  const env = existsSync(ENV_FILE) ? readFileSync(ENV_FILE, "utf8") : "";
  const match = env.match(/^LOCAL_PG_PASSWORD=(.+)$/m);
  if (match) return match[1].trim();
  const password = randomBytes(18).toString("base64url");
  const lines = [
    "# Создано scripts/local-pg.ts для локальной разработки. Не коммитить.",
    `LOCAL_PG_PASSWORD=${password}`,
    `DATABASE_URL=${localUrl(password, db)}`,
    "",
  ];
  writeFileSync(ENV_FILE, (env ? env.trimEnd() + "\n" : "") + lines.join("\n"));
  console.log("[pg] создан .env.local со случайным паролем локальной БД");
  return password;
}

export const localUrl = (password: string, db: string) => `postgres://postgres:${password}@127.0.0.1:${PG_PORT}/${db}`;

function portOpen(port: number) {
  return new Promise<boolean>((resolve) => {
    const s = net.connect(port, "127.0.0.1");
    s.once("connect", () => (s.end(), resolve(true)));
    s.once("error", () => resolve(false));
  });
}

/**
 * Запускает PostgreSQL, если он ещё не запущен (например, `npm run dev:local` уже работает).
 * Возвращает функцию остановки — она ничего не делает, если сервер запускали не мы.
 */
export async function startLocalPostgres(password: string) {
  if (await portOpen(PG_PORT)) {
    return { stop: async () => {}, startedHere: false };
  }
  const server = new EmbeddedPostgres({
    databaseDir: DATA_DIR,
    user: "postgres",
    password,
    port: PG_PORT,
    persistent: true,
    autoRehydrateSymlinks: true,
    // На Windows initdb иначе берёт кодировку системы (WIN1252) — кириллица не сохранится
    initdbFlags: ["--encoding=UTF8", "--locale=C"],
    onLog: () => {},
  });
  if (!existsSync(path.join(DATA_DIR, "PG_VERSION"))) {
    console.log("[pg] первый запуск: инициализирую PostgreSQL…");
    await server.initialise();
  }
  await server.start();
  console.log(`[pg] PostgreSQL запущен на 127.0.0.1:${PG_PORT}`);
  return { stop: () => server.stop().catch(() => {}), startedHere: true };
}

/** Создаёт базу, если её нет. Возвращает true, если база только что создана. */
export async function ensureDatabase(password: string, db: string) {
  if (!/^[a-z_][a-z0-9_]*$/.test(db)) throw new Error(`Недопустимое имя базы: ${db}`);
  const admin = new pg.Client({ connectionString: localUrl(password, "postgres") });
  await admin.connect();
  try {
    const { rowCount } = await admin.query("select 1 from pg_database where datname = $1", [db]);
    if (rowCount) return false;
    await admin.query(`create database ${db} encoding 'UTF8' template template0`);
    return true;
  } finally {
    await admin.end();
  }
}

/** Есть ли в базе таблицы приложения (т. е. база уже заполнялась). */
export async function isSeeded(password: string, db: string) {
  const c = new pg.Client({ connectionString: localUrl(password, db) });
  await c.connect();
  try {
    const r = await c.query("select to_regclass('public.users') is not null as ok");
    return r.rows[0].ok as boolean;
  } finally {
    await c.end();
  }
}
