import { expect, test } from "@playwright/test";
import { login } from "./helpers";

// Сквозной сценарий: студент заказывает справку → сотрудник готовит → студент получает
// уведомление, документ и код, по которому любой может проверить подлинность.

test("справка: от заявки студента до проверки подлинности", async ({ browser }) => {
  // --- Студентка заказывает справку
  const student = await browser.newPage();
  await login(student, "maria");
  await student.goto("/requests/new");
  await student.getByRole("link", { name: /Справка об обучении/ }).click();
  await student.getByLabel("Куда нужна").selectOption("В налоговую");
  await student.getByLabel("Количество экземпляров").fill("2");
  await student.getByRole("button", { name: "Отправить заявку" }).click();

  await expect(student).toHaveURL(/\/requests\/[0-9a-f-]{36}/);
  await expect(student.getByText("Подана").first()).toBeVisible();
  const number = (await student.getByText(/З-\d{4}-\d{5}/).first().textContent())!.match(/З-\d{4}-\d{5}/)![0];
  const requestUrl = student.url().split("?")[0];

  // --- Сотрудник видит её среди новых и проводит по статусам
  const staff = await browser.newPage();
  await login(staff, "staff");
  await expect(staff.getByRole("link", { name: new RegExp("Справка об обучении[\\s\\S]*Лебедева") }).first()).toBeVisible();
  await staff.getByText(number).click();
  await expect(staff.getByRole("heading", { name: "Справка об обучении" })).toBeVisible();
  await expect(staff.getByText("В налоговую")).toBeVisible();

  await staff.getByRole("button", { name: "Взять в работу" }).click();
  await expect(staff.getByRole("status")).toContainText("Статус обновлён");
  await staff.getByRole("button", { name: "Документ готов" }).click();
  await expect(staff.getByRole("status")).toContainText("Статус обновлён");

  // --- Студентка видит статус «Готова», уведомление и код проверки
  await student.goto(requestUrl);
  await expect(student.getByText("Готова").first()).toBeVisible();
  const codeText = await student.getByText(/Код проверки подлинности/).textContent();
  const code = codeText!.match(/[0-9A-F]{10}/)![0];

  await student.goto("/notifications");
  await expect(student.getByText(`Заявка ${number}: готова`)).toBeVisible();

  // --- Документ для печати с отметкой «концепт»
  await student.goto(`${requestUrl}/document`);
  await expect(student.getByText("КОНЦЕПТ").first()).toBeVisible();
  await expect(student.getByText(code).first()).toBeVisible();

  // --- Проверка подлинности доступна без входа
  const anon = await browser.newPage();
  await anon.goto(`/verify?code=${code}`);
  await expect(anon.getByText("Документ действителен")).toBeVisible();
  await expect(anon.getByText(number)).toBeVisible();
  // ФИО на публичной странице замаскировано
  await expect(anon.getByText("Лебедева Мария Андреевна")).toHaveCount(0);

  await anon.goto("/verify?code=0000000000");
  await expect(anon.getByText("Документ действителен")).toHaveCount(0);
});

test("студент может отменить заявку, пока её не взяли в работу", async ({ page }) => {
  await login(page, "artem");
  await page.goto("/requests");
  await page.getByRole("link", { name: /Справка об обучении/ }).first().click();
  await expect(page.getByText("Подана").first()).toBeVisible();
  await page.getByRole("button", { name: /Отменить заявку/ }).click();
  await expect(page.getByText("Отклонена").first()).toBeVisible();
  await expect(page.getByText("Отменена студентом").first()).toBeVisible();
});

test("ответ на «нужно уточнение» возвращает заявку в очередь", async ({ page }) => {
  await login(page, "artem");
  await page.goto("/requests");
  await page.getByRole("link", { name: /Материальная помощь/ }).click();
  await expect(page.getByText("Нужно уточнение").first()).toBeVisible();
  await page.getByLabel("Ответ деканату").fill("Принёс справку о составе семьи в 214 кабинет.");
  await page.getByRole("button", { name: "Ответить" }).click();
  await expect(page.getByText("Подана").first()).toBeVisible();
});
