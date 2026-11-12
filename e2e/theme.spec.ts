import { expect, test } from "@playwright/test";
import { login } from "./helpers";

// Переключатель темы: выбор запоминается и сразу приходит с сервера (без «мигания»)

test.use({ colorScheme: "light" });

test("кнопка в шапке включает тёмную тему, выбор переживает перезагрузку", async ({ page }) => {
  await page.goto("/login");
  const html = page.locator("html");
  await expect(html).toHaveAttribute("data-theme", "light");
  const bodyBg = () => page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  expect(await bodyBg()).toBe("rgb(232, 235, 237)"); // Porcelain

  await page.getByRole("button", { name: "Включить тёмную тему" }).click();
  await expect(html).toHaveAttribute("data-theme", "dark");
  expect(await bodyBg()).toBe("rgb(23, 25, 29)"); // Carbon

  // Сервер отдаёт уже тёмную страницу — атрибут есть в HTML до запуска скриптов
  const raw = await (await page.request.get("/login")).text();
  expect(raw).toMatch(/<html[^>]*data-theme="dark"/);
  await page.reload();
  await expect(html).toHaveAttribute("data-theme", "dark");

  await page.getByRole("button", { name: "Включить светлую тему" }).click();
  await expect(html).toHaveAttribute("data-theme", "light");
});

test.describe("в системе включена тёмная тема", () => {
  test.use({ colorScheme: "dark" });

  test("по умолчанию сайт всё равно светлый", async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe("rgb(232, 235, 237)");
    await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute("content", "#e8ebed");
  });

  test("«как в системе» включает тёмную", async ({ page }) => {
    await login(page, "maria");
    await page.goto("/profile");
    await page.getByRole("main").getByRole("radio", { name: "Как в системе" }).click();
    await expect(page.locator("html")).not.toHaveAttribute("data-theme");
    expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe("rgb(23, 25, 29)");
  });
});

test("в профиле можно вернуть «как в системе»", async ({ page }) => {
  await login(page, "maria");
  await page.goto("/profile");
  const group = page.getByRole("main").getByRole("radiogroup", { name: "Тема оформления" });
  await group.getByRole("radio", { name: "Тёмная" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(group.getByRole("radio", { name: "Тёмная" })).toHaveAttribute("aria-checked", "true");

  await group.getByRole("radio", { name: "Как в системе" }).click();
  await expect(page.locator("html")).not.toHaveAttribute("data-theme");
  await page.reload();
  await expect(page.locator("html")).not.toHaveAttribute("data-theme");
  await expect(group.getByRole("radio", { name: "Как в системе" })).toHaveAttribute("aria-checked", "true");
});
