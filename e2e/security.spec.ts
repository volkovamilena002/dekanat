import { expect, test } from "@playwright/test";
import { ACCOUNTS, alertOf, login } from "./helpers";

// Требования ТЗ по безопасности, проверенные «снаружи», как это сделал бы проверяющий

test.describe("Без входа", () => {
  for (const path of ["/", "/schedule", "/grades", "/grades/electives", "/requests", "/notifications", "/profile", "/staff", "/staff/schedule"]) {
    test(`${path} → страница входа`, async ({ page }) => {
      await page.goto(path);
      await expect(page).toHaveURL(/\/login$/);
    });
  }

  test("календарь .ics без входа не отдаётся", async ({ request }) => {
    const res = await request.get("/schedule/calendar.ics", { maxRedirects: 0 });
    expect(res.status()).toBeGreaterThanOrEqual(300);
    expect(await res.text()).not.toContain("BEGIN:VEVENT");
  });

  test("проверка здоровья и проверка справки — публичные", async ({ request }) => {
    const health = await request.get("/api/health");
    expect(health.ok()).toBe(true);
    expect(await health.json()).toMatchObject({ ok: true });
    expect((await request.get("/verify")).ok()).toBe(true);
  });
});

test("студент не видит чужую заявку и чужой документ даже по прямой ссылке", async ({ browser }) => {
  // Мария находит адрес своей заявки
  const maria = await browser.newPage();
  await login(maria, "maria");
  await maria.goto("/requests");
  await maria.getByRole("link", { name: /Выписка оценок/ }).click();
  await expect(maria).toHaveURL(/\/requests\/[0-9a-f-]{36}$/);
  const url = new URL(maria.url()).pathname;

  // Артём подставляет этот адрес
  const artem = await browser.newPage();
  await login(artem, "artem");
  for (const path of [url, `${url}/document`]) {
    const res = await artem.goto(path);
    expect(res?.status(), path).toBe(404);
    await expect(artem.getByText("Не найдено")).toBeVisible();
    await expect(artem.getByText("Лебедева")).toHaveCount(0);
  }
  // Мусор вместо id — тоже 404, а не ошибка сервера
  expect((await artem.goto("/requests/../../etc/passwd"))?.status()).toBe(404);
  expect((await artem.goto("/requests/not-a-uuid"))?.status()).toBe(404);
});

test("студент не попадает в кабинет сотрудника, сотрудник — в кабинет студента", async ({ browser }) => {
  const student = await browser.newPage();
  await login(student, "daniil");
  for (const path of ["/staff", "/staff/schedule", "/staff/announce"]) {
    await student.goto(path);
    await expect(student, path).toHaveURL(/\/$/);
  }

  const staff = await browser.newPage();
  await login(staff, "staff");
  await staff.goto("/grades");
  await expect(staff).toHaveURL(/\/staff$/);
});

test("cookie сессии: HttpOnly, Secure, SameSite=Lax; выход делает её недействительной", async ({ browser }) => {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await login(page, "maria");
  const [cookie] = (await ctx.cookies()).filter((c) => c.name === "dk_session");
  expect(cookie).toBeDefined();
  expect(cookie.httpOnly).toBe(true);
  expect(cookie.secure).toBe(true);
  expect(cookie.sameSite).toBe("Lax");
  // Токен в cookie недоступен скриптам страницы
  expect(await page.evaluate(() => document.cookie)).not.toContain("dk_session");

  // Выходим, а затем пробуем «украденную» старую cookie
  await page.goto("/profile");
  await page.getByRole("button", { name: "Выйти" }).click();
  await expect(page).toHaveURL(/\/login$/);
  const thief = await browser.newContext();
  await thief.addCookies([cookie]);
  const p2 = await thief.newPage();
  await p2.goto("/grades");
  await expect(p2).toHaveURL(/\/login$/);
  await ctx.close();
  await thief.close();
});

test("одинаковая ошибка для неверного пароля и несуществующего логина", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Логин").fill(ACCOUNTS.maria.login);
  await page.getByLabel("Пароль", { exact: true }).fill("wrong-password");
  await page.getByRole("button", { name: "Войти" }).click();
  await expect(alertOf(page)).toHaveText("Неверный логин или пароль");

  await page.getByLabel("Логин").fill("no-such-user");
  await page.getByLabel("Пароль", { exact: true }).fill("wrong-password");
  await page.getByRole("button", { name: "Войти" }).click();
  await expect(alertOf(page)).toHaveText("Неверный логин или пароль");
});

test("после 5 неудачных попыток вход временно блокируется", async ({ browser }) => {
  // Отдельный «IP», чтобы блокировка не задела остальные тесты
  const ctx = await browser.newContext({ extraHTTPHeaders: { "x-forwarded-for": "203.0.113.77" } });
  const page = await ctx.newPage();
  await page.goto("/login");
  for (let i = 0; i < 5; i++) {
    await page.getByLabel("Логин").fill("brute-force-target");
    await page.getByLabel("Пароль", { exact: true }).fill(`guess-${i}`);
    await page.getByRole("button", { name: "Войти" }).click();
    await expect(alertOf(page)).toHaveText("Неверный логин или пароль");
  }
  await page.getByLabel("Пароль", { exact: true }).fill("guess-6");
  await page.getByRole("button", { name: "Войти" }).click();
  await expect(alertOf(page)).toContainText("Слишком много попыток");
  await ctx.close();
});

test("одногруппники из демо-данных не могут войти", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Логин").fill("ивт-01");
  await page.getByLabel("Пароль", { exact: true }).fill("ивт-01");
  await page.getByRole("button", { name: "Войти" }).click();
  await expect(alertOf(page)).toHaveText("Неверный логин или пароль");
});

test("заголовки безопасности и запрет индексации", async ({ request }) => {
  const res = await request.get("/login");
  const h = res.headers();
  expect(h["x-frame-options"]).toBe("DENY");
  expect(h["x-content-type-options"]).toBe("nosniff");
  expect(h["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  expect(h["x-powered-by"]).toBeUndefined();
  const robots = await (await request.get("/robots.txt")).text();
  expect(robots).toMatch(/Disallow: \//);
});

test("в коде страницы нет секретов и хешей паролей", async ({ page }) => {
  await login(page, "maria");
  for (const path of ["/", "/profile", "/grades/electives"]) {
    await page.goto(path);
    const html = await page.content();
    expect(html, path).not.toContain("$argon2");
    expect(html, path).not.toMatch(/postgres:\/\//);
    expect(html, path).not.toContain("password_hash");
  }
});
