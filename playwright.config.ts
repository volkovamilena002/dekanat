import { defineConfig, devices } from "@playwright/test";
import { ensureEnv, localUrl } from "./scripts/local-pg";

/**
 * Автотесты гоняются против ПРОДАКШЕН-сборки (`next build` + `next start`) на порту 3100
 * и ОТДЕЛЬНОЙ базы `dekanat_e2e`: данные для разработки не трогаются, а сборка заодно
 * проверяется на ошибки. Перед прогоном база пересоздаётся (e2e/global-setup.ts).
 *
 *   npm run test:e2e      — все проверки
 *   npm run screenshots   — скриншоты экранов для отчёта в docs/screenshots/
 *
 * Браузер — установленный Google Chrome (channel: "chrome"), чтобы не качать Chromium.
 * Если Chrome нет: `npx playwright install chromium` и PW_BUNDLED=1.
 */
const PORT = Number(process.env.E2E_PORT ?? 3100);
export const E2E_DB = "dekanat_e2e";
const DATABASE_URL = localUrl(ensureEnv(), E2E_DB);

const browser = {
  channel: process.env.PW_BUNDLED ? undefined : "chrome",
  locale: "ru-RU",
  timezoneId: "Europe/Moscow",
};

export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/global-setup.ts",
  // Тесты меняют общую базу (заявки, места на элективах) — гоняем строго по очереди
  workers: 1,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  timeout: 30_000,
  expect: { timeout: 7_000 },
  reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-report" }]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "e2e",
      testIgnore: /(screenshots|video)\.spec\.ts/,
      use: { ...devices["Desktop Chrome"], ...browser },
    },
    {
      // Демо-видео: только после того, как прошли все автотесты
      name: "video",
      testMatch: /video\.spec\.ts/,
      dependencies: ["e2e"],
      // Русский интерфейс браузера: дата в полях — 16.11.2026, а не 11/16/2026
      use: { ...devices["Desktop Chrome"], ...browser, launchOptions: { args: ["--lang=ru-RU"] } },
    },
    {
      name: "screenshots",
      testMatch: /screenshots\.spec\.ts/,
      use: { ...devices["Desktop Chrome"], ...browser },
    },
  ],
  webServer: {
    command: `npm run build && npm run start -- -p ${PORT}`,
    url: `http://localhost:${PORT}/login`,
    timeout: 300_000,
    reuseExistingServer: !process.env.CI,
    stdout: "ignore",
    stderr: "pipe",
    env: { DATABASE_URL, SHOW_DEMO_ACCOUNTS: "1" },
  },
});
