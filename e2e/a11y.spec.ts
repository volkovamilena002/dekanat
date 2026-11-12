import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { login, type Account } from "./helpers";

/**
 * Доступность по WCAG 2.1 AA (контраст, подписи полей, имена кнопок, структура) —
 * автоматическая проверка axe-core на всех экранах в светлой и тёмной теме.
 */
async function audit(page: Page, label: string) {
  await page.waitForLoadState("networkidle");
  await expect(page).toHaveTitle(/· Мой деканат/);
  const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  const report = violations.map(
    (v) => `${label}: [${v.impact}] ${v.id} — ${v.help}\n` + v.nodes.slice(0, 4).map((n) => `    ${n.target.join(" ")}  ${n.failureSummary?.split("\n")[1] ?? ""}`).join("\n"),
  );
  return report;
}

const PAGES: [Account | null, string[]][] = [
  [null, ["/login", "/verify"]],
  ["maria", ["/", "/schedule", "/grades", "/grades/electives", "/requests", "/requests/new", "/requests/new/study_certificate", "/notifications", "/profile"]],
  ["artem", ["/requests"]],
  ["staff", ["/staff", "/staff/schedule", "/staff/announce"]],
];

for (const scheme of ["light", "dark"] as const) {
  test.describe(`Доступность, ${scheme === "light" ? "светлая" : "тёмная"} тема`, () => {
    test.use({ colorScheme: scheme });

    for (const [who, paths] of PAGES) {
      test(who ?? "без входа", async ({ page, baseURL }) => {
        // По умолчанию сайт светлый; тёмную тему выбираем, как это сделал бы пользователь
        await page.context().addCookies([{ name: "theme", value: scheme, url: baseURL! }]);
        if (who) await login(page, who);
        const problems: string[] = [];
        for (const path of paths) {
          await page.goto(path);
          problems.push(...(await audit(page, path)));
        }
        // Карточки заявки и пары открываем из списков
        if (who === "maria") {
          await page.goto("/requests");
          await page.getByRole("link", { name: /Выписка оценок/ }).click();
          problems.push(...(await audit(page, "/requests/[id]")));
        }
        if (who === "staff") {
          await page.goto("/staff");
          await page.getByRole("link", { name: /Справка/ }).first().click();
          problems.push(...(await audit(page, "/staff/requests/[id]")));
          await page.goto("/staff/schedule");
          await page.getByRole("link", { name: "Изменить" }).first().click();
          problems.push(...(await audit(page, "/staff/schedule/[id]")));
        }
        expect(problems, problems.join("\n")).toEqual([]);
      });
    }
  });
}

test("с клавиатуры: первая клавиша Tab — «Перейти к содержимому», фокус виден", async ({ page }) => {
  await login(page, "maria");
  await page.goto("/grades");
  await page.keyboard.press("Tab");
  const skip = page.getByRole("link", { name: "Перейти к содержимому" });
  await expect(skip).toBeFocused();
  await expect(skip).toBeVisible();
  await page.keyboard.press("Enter");
  await expect(page.locator("main#content")).toBeFocused();
  // Следующий Tab ведёт по содержимому страницы, а не по меню
  await page.keyboard.press("Tab");
  const outline = await page.evaluate(() => getComputedStyle(document.activeElement!).outlineStyle);
  const where = await page.evaluate(() => `${document.activeElement?.tagName} ${document.activeElement?.textContent?.slice(0, 40)} inMain=${!!document.activeElement?.closest("main")}`);
  expect(where).toContain("inMain=true");
  expect(outline).not.toBe("none");
});
