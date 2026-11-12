import { spawnSync } from "node:child_process";
import path from "node:path";
import { expect, test } from "@playwright/test";
import { ensureEnv, localUrl } from "../scripts/local-pg";
import { addDays, nextMonday } from "./helpers";
import { OVERLAY_SCRIPT, Recorder } from "./video/recorder";
import { bugsSlide, bulletsSlide, finalSlide, phonesSlide, terminalSlide, titleSlide } from "./video/slides";

/**
 * Демо-видео для жюри (до 5 минут, 720p): `npm run video` → video/dekanat-demo.webm + .srt
 * Сценарий — docs/video-script.md. Запускается только после того, как прошли все автотесты
 * (dependencies в playwright.config.ts), поэтому «N passed» на слайде — правда.
 * Ссылку на сайт для финального слайда можно задать: VIDEO_SITE_URL=https://… npm run video
 */

const OUT = path.join(process.cwd(), "video", "dekanat-demo.webm");
const SCREENS = path.join(process.cwd(), "docs", "screenshots");

test.setTimeout(15 * 60_000);

test.beforeAll(() => {
  // Свежие демо-данные: автотесты перед записью успели их поменять
  const r = spawnSync("npx", ["tsx", "scripts/setup-db.ts"], {
    shell: true,
    stdio: "ignore",
    env: { ...process.env, DATABASE_URL: localUrl(ensureEnv(), "dekanat_e2e") },
  });
  if (r.status !== 0) throw new Error("Не удалось пересоздать демо-данные");
});

function e2eTitles() {
  const r = spawnSync("npx", ["playwright", "test", "--project=e2e", "--list"], { shell: true, encoding: "utf8" });
  return r.stdout
    .split("\n")
    .filter((l) => l.includes("[e2e] ›"))
    .map((l) => l.split(" › ").slice(2).join(" › ").trim());
}

function repoUrl() {
  const r = spawnSync("git", ["remote", "get-url", "origin"], { encoding: "utf8" });
  const m = r.stdout?.trim().match(/github\.com[:/](.+?)(\.git)?$/);
  return m ? `github.com/${m[1]}` : null;
}

test("демо-видео", async ({ browser, baseURL }) => {
  const context = await browser.newContext({
    baseURL,
    viewport: { width: 1280, height: 720 },
    colorScheme: "light",
    locale: "ru-RU",
    timezoneId: "Europe/Moscow",
  });
  await context.addInitScript(OVERLAY_SCRIPT);
  const page = await context.newPage();
  const rec = new Recorder(page);
  const slide = async (html: string, ms: number, cue?: string) => {
    await rec.hide();
    await page.setContent(html, { waitUntil: "load" });
    if (cue) rec.cue(cue);
    await page.waitForTimeout(ms);
  };
  const go = async (url: string) => {
    await page.goto(url);
    await page.waitForLoadState("networkidle");
    await rec.restoreOverlay();
  };
  const signIn = async (who: "Даниил Орлов" | "Артём Соколов" | "Ольга Петрова") => {
    if (!page.url().endsWith("/login")) await go("/login");
    await rec.click(page.getByRole("button", { name: new RegExp(who) }));
    await rec.click(page.getByRole("button", { name: "Войти" }));
    await page.waitForURL(who === "Ольга Петрова" ? /\/staff$/ : /\/$/);
    await page.waitForLoadState("networkidle");
    await rec.restoreOverlay();
  };
  const signOut = async (staff = false) => {
    if (!staff) await go("/profile");
    await rec.click(page.getByRole("button", { name: "Выйти" }).first());
    await page.waitForURL(/\/login$/);
    await rec.restoreOverlay();
  };

  await rec.start(context);

  // ---------- 0. Титр ----------
  await slide(titleSlide(), 4500);

  // ---------- 1. Идея ----------
  await go("/login");
  await rec.scene("Идея");
  await rec.say("Расписание — на одном сайте, оценки — в другом, за справкой — очередь в деканат.");
  await rec.say("А о переносе пары узнаёшь у закрытой аудитории.");
  await rec.say("«Мой деканат» за пару касаний отвечает на три вопроса студента: что у меня сейчас, как дела с учёбой и как получить документ без очереди.");
  await rec.say("Это концепт для конкурса: все данные вымышленные.", () => rec.point(page.getByRole("note")));

  // ---------- 2. Сегодня ----------
  await rec.scene("Сегодня");
  await rec.say("Захожу как студент Даниил — тестовые аккаунты есть прямо на странице входа.", () => signIn("Даниил Орлов"));
  await rec.scene("Сегодня");
  await rec.say("Главный экран — «Сегодня»: какая пара сейчас или следующая, где она и сколько до неё.", () =>
    rec.point(page.getByRole("main").locator("section").first()),
  );
  await rec.say("Рядом — изменения в расписании: отмены, переносы, замены преподавателя.", () =>
    rec.point(page.getByRole("heading", { name: "Изменения в расписании" })),
  );
  await rec.say("Ниже — дедлайны, риски по учёбе и мои заявки. Всё важное — на одном экране.", () =>
    rec.scrollTo(page.getByRole("heading", { name: "Как дела с учёбой" })),
  );
  await rec.scrollTop();

  // ---------- 3. Расписание ----------
  await rec.scene("Расписание");
  await rec.click(page.getByRole("link", { name: "Расписание", exact: true }).first());
  await page.waitForURL(/\/schedule/);
  await rec.say("В расписании — вся неделя. Оранжевая точка — в этот день что-то изменилось.", async () => {
    const changedDay = page.getByRole("link").filter({ hasText: "есть изменения" }).first();
    await rec.click(changedDay);
    await page.waitForLoadState("networkidle");
  });
  const changed = page.getByRole("main").getByRole("listitem").filter({ hasText: /Отменена|Перенесена|Замена|Новая аудитория|Перенос/ }).first();
  await rec.say("Отменённая пара зачёркнута, у переноса и замены подписано, что изменилось.", () => rec.point(changed));
  await rec.say("А расписание можно одной кнопкой добавить в календарь телефона.", () => rec.point(page.getByRole("link", { name: "В календарь" })));

  // ---------- 4. Учёба и элективы ----------
  await rec.scene("Учёба");
  await rec.click(page.getByRole("link", { name: "Учёба", exact: true }).first());
  await page.waitForURL(/\/grades$/);
  const risky = page.getByRole("listitem").filter({ hasText: "Риск долга" }).first();
  await rec.say("Успеваемость — светофор по каждой дисциплине: зелёный — всё хорошо, красный — риск долга.", () => rec.scrollTo(risky));
  await rec.say("Видны баллы за каждую контрольную и прогноз итоговой оценки.", () => rec.click(risky.getByText("Показать баллы")));
  await rec.scrollTop();
  await rec.say("А здесь — сохранится ли стипендия, если ничего не менять.", () => rec.point(page.getByText("Стипендия", { exact: true })));
  await rec.click(page.getByRole("link", { name: /Дисциплины по выбору/ }));
  await page.waitForURL(/electives/);
  await rec.say("Запись на элективы: видно, сколько мест осталось.");
  await rec.say("Отказываюсь от одной дисциплины — место сразу освобождается для других.", () =>
    rec.click(page.getByRole("button", { name: "Отказаться от дисциплины «Основы кибербезопасности»" })),
  );
  await rec.say("Выбираю другую. На заполненный курс записаться нельзя.", async () => {
    await rec.click(page.getByRole("button", { name: "Выбрать дисциплину «Мобильная разработка»" }));
    await rec.point(page.getByRole("button", { name: "Мест нет" }));
  });

  // ---------- 5. Справка ----------
  await rec.scene("Справка без очереди");
  await rec.say("Справку заказываю онлайн: выбираю, куда она нужна, и отправляю.", async () => {
    await rec.click(page.getByRole("link", { name: "Заявки", exact: true }).first());
    await rec.click(page.getByRole("link", { name: "Новая заявка" }));
    await rec.click(page.getByRole("link", { name: /Справка об обучении/ }));
    await rec.point(page.getByLabel("Куда нужна"));
    await page.getByLabel("Куда нужна").selectOption("В налоговую");
    await rec.type(page.getByLabel("Количество экземпляров"), "2");
    await rec.click(page.getByRole("button", { name: "Отправить заявку" }));
    await page.waitForURL(/\/requests\/[0-9a-f-]{36}/);
  });
  const requestPath = new URL(page.url()).pathname;
  const number = (await page.getByText(/З-\d{4}-\d{5}/).first().textContent())!.match(/З-\d{4}-\d{5}/)![0];
  await rec.say("Дальше заявка отслеживается, как посылка: подана, в работе, готова.", () => rec.point(page.getByRole("heading", { name: "Статус заявки" })));
  await rec.silence();
  await signOut();

  // ---------- 6. Деканат ----------
  await rec.scene("Деканат");
  await rec.say("Теперь — кабинет сотрудника деканата.", () => signIn("Ольга Петрова"));
  await rec.scene("Деканат");
  await rec.say("Новая заявка первая в очереди. Сотрудник берёт её в работу…", async () => {
    await rec.click(page.getByText(number));
    await rec.click(page.getByRole("button", { name: "Взять в работу" }));
    await expect(page.getByRole("status")).toBeVisible();
  });
  await rec.say("…и отмечает, что документ готов. Студент получает уведомление в ту же секунду.", async () => {
    await rec.click(page.getByRole("button", { name: "Документ готов" }));
    await expect(page.getByRole("status")).toBeVisible();
  });

  await rec.click(page.getByRole("link", { name: "Расписание", exact: true }));
  await rec.say("Сотрудник может перенести или отменить пару, сменить аудиторию или преподавателя.", () =>
    rec.click(page.getByRole("link", { name: "Следующая неделя" })),
  );
  // День следующей недели, где у группы минимум две пары, которые можно изменить
  const monday = nextMonday();
  let date = monday;
  for (let i = 0; i < 5; i++) {
    date = addDays(monday, i);
    if (i > 0) await rec.click(page.locator(`ol a[href*="date=${date}"]`));
    await page.waitForURL(new RegExp(`date=${date}`));
    if ((await page.getByRole("link", { name: "Изменить" }).count()) >= 2) break;
  }
  const editable = page.getByRole("listitem").filter({ has: page.getByRole("link", { name: "Изменить" }) });
  const busyPair = (await editable.nth(1).getByText(/^\d пара$/).textContent())!.slice(0, 1);
  await rec.click(editable.first().getByRole("link", { name: "Изменить" }));
  await page.waitForURL(/\/staff\/schedule\/[0-9a-f-]{36}/);
  await rec.say("Система сама проверяет пересечения: у группы в это время уже есть пара.", async () => {
    await rec.click(page.getByLabel("Новая дата"));
    await page.getByLabel("Новая дата").fill(date);
    await rec.point(page.getByLabel("Пара"));
    await page.getByLabel("Пара").selectOption(busyPair);
    await rec.click(page.getByRole("button", { name: "Перенести пару" }));
    await rec.point(page.locator('[role="alert"]:not(#__next-route-announcer__)'));
  });
  await rec.say("Переношу на субботу — и все студенты группы сразу получают уведомление.", async () => {
    await page.getByLabel("Новая дата").fill(addDays(monday, 5));
    await rec.point(page.getByLabel("Пара"));
    await page.getByLabel("Пара").selectOption("7");
    await rec.click(page.getByRole("button", { name: "Перенести пару" }));
    await page.waitForURL(/notified=/);
    await rec.restoreOverlay();
    await rec.point(page.getByRole("status"));
  });
  await rec.silence();
  await signOut(true);

  // ---------- 7. Снова студент ----------
  await rec.scene("Справка без очереди");
  await signIn("Даниил Орлов");
  await rec.click(page.getByRole("link", { name: /Уведомления/ }).first());
  await page.waitForURL(/notifications/);
  await rec.say("У студента — уведомления: справка готова, пара перенесена.", () => rec.point(page.getByText(`Заявка ${number}: готова`)));
  await rec.click(page.getByRole("button", { name: new RegExp(`Заявка ${number}: готова`) }));
  await page.waitForURL(/\/requests\//);
  await rec.say("Готовую справку можно открыть — у неё есть код проверки подлинности.", async () => {
    await rec.click(page.getByRole("link", { name: "Открыть документ" }));
    await page.waitForURL(/document/);
    await rec.restoreOverlay();
  });
  const code = (await page.getByText(/^[0-9A-F]{10}$/).first().textContent())!.trim();
  await rec.point(page.getByText(code).first());
  await go("/verify");
  await rec.say("Любой — например, работодатель — проверит справку на сайте без входа.", async () => {
    await rec.type(page.locator("#code"), code);
    await rec.click(page.getByRole("button", { name: "Проверить" }));
    await expect(page.getByText("Документ действителен")).toBeVisible();
    await rec.restoreOverlay();
    await rec.point(page.getByText("Документ действителен"));
  });

  // ---------- 8. Безопасность ----------
  await rec.silence();
  await signOut();
  await rec.scene("Безопасность");
  await rec.say("А если другой студент подставит в адрес номер чужой заявки?", () => signIn("Артём Соколов"));
  await go(requestPath);
  await rec.say("Сервер отвечает «не найдено»: чужие данные не видны даже по прямой ссылке.", () => rec.point(page.getByText("Не найдено", { exact: true })));
  await go("/");
  await rec.scene("Качество");
  await rec.say("Пароли хранятся только в виде хеша, ключей в коде нет. Есть светлая и тёмная тема.", async () => {
    await rec.click(page.getByRole("radio", { name: "Тема: тёмная" }));
    await page.waitForTimeout(1500);
  });
  await rec.click(page.getByRole("radio", { name: "Тема: светлая" }));
  await slide(
    phonesSlide(
      [
        { file: path.join(SCREENS, "m02-today.png"), label: "«Сегодня»" },
        { file: path.join(SCREENS, "m05-electives.png"), label: "Элективы" },
        { file: path.join(SCREENS, "m20-today-dark.png"), label: "Тёмная тема" },
      ],
      "Интерфейс работает на экранах от 360 пикселей, контраст проверен по стандарту доступности WCAG.",
    ),
    Recorder.readMs("Интерфейс работает на экранах от 360 пикселей, контраст проверен по стандарту доступности WCAG.") + 800,
    "Интерфейс работает на экранах от 360 пикселей, контраст проверен по стандарту доступности WCAG.",
  );

  // ---------- 9. Как работал ИИ ----------
  const aiText = "Весь код написал ИИ-агент Claude Code, а я ставил задачи и принимал решения. У агента есть инструкция: стек, правила безопасности, требования ТЗ. Каждый этап записан в журнал.";
  await slide(
    bulletsSlide(
      "Масштаб ИИ",
      "Как работал ИИ",
      [
        "Весь код написал ИИ-агент <b>Claude Code</b>; я ставил задачи и принимал решения",
        "Инструкция для агента — <b>CLAUDE.md</b>: стек, правила безопасности, требования ТЗ",
        "7 этапов, каждый в журнале <b>docs/ai-log.md</b>: промпты, решения и ошибки ИИ",
        "ИИ проверял себя сам: автотесты, скриншоты, проверка доступности",
      ],
      aiText,
    ),
    Recorder.readMs(aiText) + 1500,
    aiText,
  );
  const bugText = "Ошибки у ИИ были — и ловили их не глазами, а проверками: автотестами и проверкой доступности.";
  await slide(
    bugsSlide(
      [
        ["Встраиваемая база падала, когда Next.js работал в нескольких процессах", "Запуск и логи", "Перешли на настоящий PostgreSQL"],
        ["Чужая заявка возвращала статус 200 вместо 404 (данные не утекали)", "Автотест безопасности", "Честный 404 на сервере"],
        ["Страница входа на экране 360 px была шире экрана", "Автотест вёрстки", "Исправлена сетка и карточки"],
        ["Слабый контраст цветов в светлой теме (3,9 вместо 4,5)", "Проверка WCAG (axe)", "Цвета подобраны расчётом"],
      ],
      bugText,
    ),
    Recorder.readMs(bugText) + 4500,
    bugText,
  );
  const titles = e2eTitles();
  const n = titles.length;
  const one = n % 10 === 1 && n % 100 !== 11;
  const few = [2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100);
  const testText = `${n} ${one ? "автотест" : few ? "автотеста" : "автотестов"} одной командой ${one ? "проверяет" : "проверяют"} сценарии, безопасность и вёрстку — так коду, который написал ИИ, можно доверять.`;
  await slide(
    terminalSlide("npm run test:e2e", titles, `${titles.length} passed`, testText),
    Recorder.readMs(testText) + 1500,
    testText,
  );

  // ---------- 10. Итог ----------
  await slide(finalSlide(process.env.VIDEO_SITE_URL ?? "ссылка — в описании работы", repoUrl()), 6000, "«Мой деканат» — расписание, учёба, справки и новости деканата в одном месте. Спасибо!");

  await rec.stop();
  await context.close();
  const seconds = await rec.encode(OUT);
  console.log(`Видео: ${OUT} (${Math.floor(seconds / 60)}:${String(Math.round(seconds % 60)).padStart(2, "0")})`);
  expect(seconds, "видео должно быть не длиннее 5 минут").toBeLessThanOrEqual(300);
});

