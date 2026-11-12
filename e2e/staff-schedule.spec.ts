import { expect, test, type Page } from "@playwright/test";
import { addDays, alertOf, login, nextMonday } from "./helpers";

// Сотрудник меняет расписание → группа сразу видит изменение и получает уведомление

/** День следующей недели, где у ИВТ-31 минимум две пары, которые можно изменить */
async function openDayWithEditableLessons(page: Page) {
  const monday = nextMonday();
  for (let i = 0; i < 5; i++) {
    const date = addDays(monday, i);
    await page.goto(`/staff/schedule?date=${date}`);
    await expect(page.getByRole("heading", { name: "Расписание групп" })).toBeVisible();
    const editable = page.getByRole("listitem").filter({ has: page.getByRole("link", { name: "Изменить" }) });
    if ((await editable.count()) >= 2) return { date, editable };
  }
  throw new Error("Не нашлось дня с двумя изменяемыми парами");
}

const pairOf = async (item: ReturnType<Page["getByRole"]>) => Number((await item.getByText(/^\d пара$/).textContent())!.slice(0, 1));
const subjectOf = async (item: ReturnType<Page["getByRole"]>) => (await item.locator("p.font-semibold").first().textContent())!.trim();

test("перенос пары: пересечение отклоняется, перенос в свободное время доходит до студента", async ({ browser }) => {
  const staff = await browser.newPage();
  await login(staff, "staff");
  await staff.getByRole("link", { name: "Расписание", exact: true }).click();
  await expect(staff.getByRole("link", { name: /ИВТ-31/ })).toBeVisible();

  const { date, editable } = await openDayWithEditableLessons(staff);
  const first = editable.nth(0);
  const busyPair = await pairOf(editable.nth(1));
  const subject = await subjectOf(first);
  await first.getByRole("link", { name: "Изменить" }).click();
  await expect(staff.getByRole("heading", { name: "Изменить пару" })).toBeVisible();

  // 1. В занятое время — понятная ошибка, введённое не теряется
  await staff.getByLabel("Новая дата").fill(date);
  await staff.getByLabel("Пара").selectOption(String(busyPair));
  await staff.getByLabel(/Комментарий для студентов/).fill("Автотест: перенос");
  await staff.getByRole("button", { name: "Перенести пару" }).click();
  await expect(alertOf(staff)).toContainText("У группы в это время уже есть пара");
  await expect(staff.getByLabel("Новая дата")).toHaveValue(date);
  await expect(staff.getByLabel(/Комментарий для студентов/)).toHaveValue("Автотест: перенос");

  // 2. На субботу, 7 пару — свободно
  const saturday = addDays(nextMonday(), 5);
  await staff.getByLabel("Новая дата").fill(saturday);
  await staff.getByLabel("Пара").selectOption("7");
  await staff.getByRole("button", { name: "Перенести пару" }).click();
  await expect(staff.getByRole("status")).toContainText(/Уведомление отправлено \d+ студент/);
  await expect(staff).toHaveURL(new RegExp(`date=${saturday}`));
  await expect(staff.getByText(subject).first()).toBeVisible();

  // 3. Студентка группы видит перенос в расписании и уведомление
  const student = await browser.newPage();
  await login(student, "maria");
  await student.goto(`/schedule?date=${date}`);
  await expect(student.getByText(/Перенесена на сб.*7 пару \(18:50\)\. Автотест: перенос/).first()).toBeVisible();
  await student.goto(`/schedule?date=${saturday}`);
  await expect(student.getByText(subject).first()).toBeVisible();
  await expect(student.getByText(/Перенос с/).first()).toBeVisible();
  await student.goto("/notifications");
  await expect(student.getByText("Пара перенесена").first()).toBeVisible();
  await expect(student.getByText(new RegExp(`${subject}: перенесена на сб`))).toBeVisible();

  // 4. Студент другой группы этого уведомления не получает
  const other = await browser.newPage();
  await login(other, "artem");
  await other.goto("/notifications");
  await expect(other.getByText(new RegExp(`${subject}: перенесена`))).toHaveCount(0);
});

test("отмена пары требует причину и показывается студентам", async ({ browser }) => {
  const staff = await browser.newPage();
  await login(staff, "staff");
  const { date, editable } = await openDayWithEditableLessons(staff);
  const subject = await subjectOf(editable.first());
  await editable.first().getByRole("link", { name: "Изменить" }).click();

  await staff.getByText("Отменить", { exact: true }).click();
  await expect(staff.getByLabel("Причина")).toBeVisible();
  await staff.getByLabel("Причина").fill("Автотест: преподаватель на конференции");
  await staff.getByRole("button", { name: "Отменить пару" }).click();
  await expect(staff.getByRole("status")).toContainText("Изменение сохранено");

  // Отменённую пару больше нельзя изменить
  const cancelled = staff.getByRole("listitem").filter({ hasText: "Автотест: преподаватель на конференции" });
  await expect(cancelled.getByText("Отменена")).toBeVisible();
  await expect(cancelled.getByRole("link", { name: "Изменить" })).toHaveCount(0);

  const student = await browser.newPage();
  await login(student, "daniil");
  await student.goto(`/schedule?date=${date}`);
  const row = student.getByRole("listitem").filter({ hasText: "Автотест: преподаватель на конференции" });
  await expect(row.getByText("Отменена")).toBeVisible();
  await expect(row.getByText(subject).first()).toBeVisible();
});

test("смена аудитории: занятую аудиторию выбрать нельзя", async ({ page }) => {
  await login(page, "staff");
  const { editable } = await openDayWithEditableLessons(page);
  await editable.first().getByRole("link", { name: "Изменить" }).click();
  await page.getByText("Аудитория", { exact: true }).click();
  // Кнопки-подсказки показывают только свободные аудитории
  const free = page.getByRole("button", { name: /^\d-\d{3}$/ });
  expect(await free.count()).toBeGreaterThan(3);
  await free.first().click();
  const room = await page.getByLabel("Новая аудитория").inputValue();
  await page.getByRole("button", { name: "Сменить аудиторию" }).click();
  await expect(page.getByRole("status")).toContainText("Изменение сохранено");
  await expect(page.getByText(new RegExp(`→ ${room}`)).first()).toBeVisible();
});
