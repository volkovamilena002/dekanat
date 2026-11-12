import { expect, test } from "@playwright/test";
import { expectNoHorizontalScroll, login } from "./helpers";

// ТЗ: мобильная версия с 360 px. Проверяем самую узкую ширину на всех экранах.
test.use({ viewport: { width: 360, height: 740 }, isMobile: true, hasTouch: true });

const STUDENT = ["/", "/schedule", "/grades", "/grades/electives", "/requests", "/requests/new", "/requests/new/study_certificate", "/notifications", "/profile"];
const STAFF = ["/staff", "/staff/schedule", "/staff/announce"];

test("экраны студента на 360 px: без горизонтальной прокрутки, нижнее меню на месте", async ({ page }) => {
  await login(page, "artem");
  for (const path of STUDENT) {
    await page.goto(path);
    await expectNoHorizontalScroll(page);
    await expect(page.getByRole("navigation", { name: "Основная навигация" }).filter({ visible: true }).getByRole("link", { name: "Расписание" })).toBeVisible();
  }
  // Карточка заявки
  await page.goto("/requests");
  await page.getByRole("link", { name: /Материальная помощь/ }).click();
  await expectNoHorizontalScroll(page);
});

test("экраны сотрудника на 360 px", async ({ page }) => {
  await login(page, "staff");
  for (const path of STAFF) {
    await page.goto(path);
    await expectNoHorizontalScroll(page);
  }
  await page.goto("/staff/schedule");
  const edit = page.getByRole("link", { name: "Изменить" }).first();
  if (await edit.count()) {
    await edit.click();
    await expectNoHorizontalScroll(page);
  }
});

test("вход и проверка справки на 360 px", async ({ page }) => {
  for (const path of ["/login", "/verify"]) {
    await page.goto(path);
    await expectNoHorizontalScroll(page);
  }
});
