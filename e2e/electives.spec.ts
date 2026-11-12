import { expect, test } from "@playwright/test";
import { alertOf, login } from "./helpers";

// Запись на элективы: лимит выбора, места, отказ, серверная защита

test("запись на элективы: выбрать две, упереться в лимит, отказаться", async ({ page }) => {
  await login(page, "maria");
  await page.goto("/grades");
  await page.getByRole("link", { name: /Дисциплины по выбору/ }).click();
  await expect(page.getByRole("heading", { name: "Дисциплины по выбору" })).toBeVisible();
  await expect(page.getByText("Выбрано 0 из 2")).toBeVisible();

  // Электив без мест выбрать нельзя
  await expect(page.getByRole("button", { name: "Мест нет" })).toBeDisabled();

  await page.getByRole("button", { name: "Выбрать дисциплину «Анализ данных на Python»" }).click();
  await expect(page.getByText("Выбрано 1 из 2")).toBeVisible();
  await page.getByRole("button", { name: "Выбрать дисциплину «Мобильная разработка»" }).click();
  await expect(page.getByText("Выбор сделан")).toBeVisible();

  // Остальные заблокированы, счётчик мест вырос
  await expect(page.getByRole("button", { name: "Уже выбрано 2" }).first()).toBeDisabled();
  const card = page.getByRole("listitem").filter({ hasText: "Анализ данных на Python" });
  await expect(card.getByText("Занято 10 из 25")).toBeVisible();

  // Отказ освобождает место
  await page.getByRole("button", { name: "Отказаться от дисциплины «Анализ данных на Python»" }).click();
  await expect(page.getByText("Выбрано 1 из 2")).toBeVisible();
  await expect(card.getByText("Занято 9 из 25")).toBeVisible();

  // Выбор виден на главной
  await page.goto("/");
  await expect(page.getByText(/Выбрано 1 из 2/)).toBeVisible();
});

test("сервер не даёт занять место, даже если «разблокировать» кнопку в браузере", async ({ page }) => {
  await login(page, "artem");
  await page.goto("/grades/electives");
  // «Деловой английский» заполнен — включаем кнопку вручную, как это сделал бы хитрый студент
  const full = page.getByRole("button", { name: "Мест нет" });
  await full.evaluate((b) => b.removeAttribute("disabled"));
  await full.click();
  await expect(alertOf(page)).toHaveText("Места закончились — выберите другую дисциплину");
});

test("студент видит элективы только своего курса", async ({ page }) => {
  await login(page, "artem");
  await page.goto("/grades/electives");
  await expect(page.getByText("Финансовая грамотность")).toBeVisible();
  await expect(page.getByText("Разработка игр на Unity")).toHaveCount(0);
});
