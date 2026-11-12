import { expect, test, type Page } from "@playwright/test";
import { login, type Account } from "./helpers";

/**
 * Скриншоты экранов для отчёта жюри: `npm run screenshots` → docs/screenshots/*.png
 * Данные каждый раз свежие (тестовая база пересоздаётся перед прогоном).
 */
const DIR = "docs/screenshots";

async function shot(page: Page, name: string, opts: { fullPage?: boolean } = {}) {
  await page.evaluate(() => document.fonts.ready);
  await page.waitForLoadState("networkidle");
  await page.screenshot({ path: `${DIR}/${name}.png`, fullPage: opts.fullPage ?? false, animations: "disabled" });
}

const MOBILE = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true };

test.describe("Телефон, светлая тема", () => {
  test.use({ ...MOBILE, colorScheme: "light" });

  test("студент", async ({ page }) => {
    await page.goto("/login");
    await shot(page, "m01-login");

    await login(page, "maria");
    await shot(page, "m02-today");

    await page.goto("/schedule");
    await shot(page, "m03-schedule");

    await page.goto("/grades");
    await shot(page, "m04-grades");

    await page.goto("/grades/electives");
    await shot(page, "m05-electives");

    await page.goto("/requests/new");
    await shot(page, "m06-request-catalog");

    await page.goto("/requests");
    await shot(page, "m07-requests");
    await page.getByRole("link", { name: /Выписка оценок/ }).click();
    await shot(page, "m08-request-ready");

    await page.goto("/notifications");
    await shot(page, "m09-notifications");

    await page.goto("/profile");
    await shot(page, "m10-profile");
  });

  test("студент с рисками", async ({ page }) => {
    await login(page, "artem");
    await page.goto("/grades");
    await shot(page, "m11-grades-risk");
    await page.goto("/requests");
    await page.getByRole("link", { name: /Материальная помощь/ }).click();
    await shot(page, "m12-request-needs-info");
  });
});

test.describe("Телефон, тёмная тема", () => {
  test.use({ ...MOBILE, colorScheme: "dark" });

  for (const [who, name, path] of [
    ["maria", "m20-today-dark", "/"],
    ["maria", "m21-schedule-dark", "/schedule"],
    ["daniil", "m22-grades-dark", "/grades"],
  ] as [Account, string, string][]) {
    test(name, async ({ page, baseURL }) => {
      await page.context().addCookies([{ name: "theme", value: "dark", url: baseURL! }]);
      await login(page, who);
      await page.goto(path);
      await shot(page, name);
    });
  }
});

test.describe("Компьютер", () => {
  test.use({ viewport: { width: 1440, height: 900 }, colorScheme: "light" });

  test("студент", async ({ page }) => {
    await login(page, "maria");
    await shot(page, "d01-today", { fullPage: true });
    await page.goto("/schedule");
    await shot(page, "d02-schedule");
    await page.goto("/grades");
    await shot(page, "d03-grades", { fullPage: true });
  });

  test("сотрудник", async ({ page }) => {
    await login(page, "staff");
    await shot(page, "d10-staff-requests");
    await page.getByRole("link", { name: /Справка об обучении[\s\S]*Соколов/ }).first().click();
    await shot(page, "d11-staff-request");

    await page.goto("/staff/schedule");
    await shot(page, "d12-staff-schedule");
    const edit = page.getByRole("link", { name: "Изменить" }).first();
    if (await edit.count()) {
      await edit.click();
      await page.getByText("Аудитория", { exact: true }).click();
      await shot(page, "d13-staff-lesson-edit");
    }

    await page.goto("/staff/announce");
    await shot(page, "d14-staff-announce");
  });

  test("проверка подлинности справки", async ({ browser }) => {
    const student = await browser.newPage();
    await login(student, "maria");
    await student.goto("/requests");
    await student.getByRole("link", { name: /Выписка оценок/ }).click();
    const code = (await student.getByText(/Код проверки подлинности/).textContent())!.match(/[0-9A-F]{10}/)![0];
    await student.goto(`${new URL(student.url()).pathname}/document`);
    await shot(student, "d20-document");

    const anon = await browser.newPage({ viewport: { width: 1440, height: 900 }, colorScheme: "light" });
    await anon.goto(`/verify?code=${code}`);
    await expect(anon.getByText("Документ действителен")).toBeVisible();
    await shot(anon, "d21-verify");
  });
});
