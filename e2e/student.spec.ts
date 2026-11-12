import { expect, test } from "@playwright/test";
import { login } from "./helpers";

// Обязательное ядро ТЗ глазами студента: вход и профиль, расписание, успеваемость, уведомления

test.describe("Кабинет студента", () => {
  test.beforeEach(async ({ page }) => {
    await login(page, "maria");
  });

  test("«Сегодня»: приветствие, пары, изменения, дедлайны", async ({ page }) => {
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Мария");
    await expect(page.getByRole("heading", { name: "Изменения в расписании" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Ближайшие дедлайны" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Мои заявки" })).toBeVisible();
  });

  test("на каждой странице видно, что это концепт, а не официальный сервис", async ({ page }) => {
    for (const path of ["/", "/schedule", "/grades", "/requests", "/notifications", "/profile"]) {
      await page.goto(path);
      const note = page.getByRole("note");
      await expect(note).toContainText("Концепт для конкурса «Цифровой деканат будущего»");
      await expect(note).toContainText("не официальный сервис вуза");
      await expect(note).toContainText("Все данные вымышленные");
    }
  });

  test("профиль: ФИО, факультет, направление, курс, группа", async ({ page }) => {
    await page.goto("/profile");
    const main = page.locator("main");
    await expect(main.getByText("Лебедева Мария Андреевна")).toBeVisible();
    await expect(main.getByText("Факультет информационных технологий")).toBeVisible();
    await expect(main.getByText(/09\.03\.01/)).toBeVisible();
    await expect(main.getByText("ИВТ-31").first()).toBeVisible();
  });

  test("расписание: неделя, аудитория, преподаватель, изменения", async ({ page }) => {
    await page.goto("/schedule");
    await expect(page.getByRole("heading", { name: "Расписание" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Изменения на неделе" })).toBeVisible();
    // Переключение на следующую неделю и обратно
    await page.getByRole("link", { name: "Следующая неделя" }).click();
    await expect(page.getByRole("link", { name: "Вернуться к сегодняшнему дню" })).toBeVisible();
    // В понедельник у ИВТ-31 три пары с аудиторией и преподавателем
    const days = page.getByRole("list").filter({ has: page.getByRole("link", { name: /^ПН/i }) });
    await days.getByRole("link").first().click();
    await expect(page.getByText("Базы данных").first()).toBeVisible();
    await expect(page.getByText(/^\d-\d{3}$/).first()).toBeVisible();
  });

  test("экспорт расписания в календарь (.ics)", async ({ page }) => {
    const res = await page.request.get("/schedule/calendar.ics");
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toContain("text/calendar");
    const body = await res.text();
    expect(body).toContain("BEGIN:VCALENDAR");
    expect(body.match(/BEGIN:VEVENT/g)?.length ?? 0).toBeGreaterThan(20);
  });

  test("успеваемость: баллы, светофор, сессия, прошлые семестры", async ({ page }) => {
    await page.goto("/grades");
    await expect(page.getByRole("heading", { name: "Успеваемость" })).toBeVisible();
    await expect(page.getByText("Средний балл")).toBeVisible();
    await expect(page.getByText("Дисциплины семестра")).toBeVisible();
    await expect(page.getByText("Базы данных").first()).toBeVisible();
    await expect(page.getByText(/\/ 100 баллов/).first()).toBeVisible();
    await expect(page.getByText("Зачётная неделя и сессия")).toBeVisible();
    await page.getByText("4 семестр").click();
    await expect(page.getByText("Математическая статистика")).toBeVisible();
  });

  test("уведомления: вкладки и отметка «прочитано»", async ({ page }) => {
    await page.goto("/notifications");
    await expect(page.getByRole("heading", { name: "Уведомления" })).toBeVisible();
    await expect(page.getByText("Запись на элективы весеннего семестра")).toBeVisible();
    await page.getByRole("link", { name: /Дедлайны/ }).click();
    await expect(page).toHaveURL(/tab=deadline/);
    await expect(page.getByText("Защита курсовой по базам данных")).toBeVisible();
  });
});
