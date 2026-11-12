import { expect, type Page } from "@playwright/test";

/** Сообщение об ошибке на странице (без служебного #__next-route-announcer__ c role="alert") */
export const alertOf = (page: Page) => page.locator('[role="alert"]:not(#__next-route-announcer__)');

// Демо-аккаунты из scripts/setup-db.ts (данные вымышленные)
export const ACCOUNTS = {
  maria: { login: "maria", password: "maria2026", name: "Мария" },
  daniil: { login: "daniil", password: "daniil2026", name: "Даниил" },
  artem: { login: "artem", password: "artem2026", name: "Артём" },
  staff: { login: "dekanat", password: "dekanat2026", name: "Петрова" },
} as const;

export type Account = keyof typeof ACCOUNTS;

/** Вход через форму, как это делает человек */
export async function login(page: Page, who: Account) {
  const a = ACCOUNTS[who];
  await page.goto("/login");
  await page.getByLabel("Логин").fill(a.login);
  await page.getByLabel("Пароль", { exact: true }).fill(a.password);
  await page.getByRole("button", { name: "Войти" }).click();
  await expect(page).toHaveURL(who === "staff" ? /\/staff$/ : /\/$/);
}

/** Сегодня по Москве, YYYY-MM-DD — как в приложении (src/lib/time.ts) */
export function todayMsk() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Moscow" }).format(new Date());
}

export function addDays(date: string, n: number) {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Понедельник следующей недели */
export function nextMonday(today = todayMsk()) {
  const wd = new Date(`${today}T12:00:00Z`).getUTCDay() || 7;
  return addDays(today, 8 - wd);
}

/** Нет горизонтальной прокрутки страницы */
export async function expectNoHorizontalScroll(page: Page) {
  const { scroll, client } = await page.evaluate(() => ({
    scroll: document.documentElement.scrollWidth,
    client: document.documentElement.clientWidth,
  }));
  expect(scroll, `ширина контента ${scroll}px больше экрана ${client}px`).toBeLessThanOrEqual(client);
}
