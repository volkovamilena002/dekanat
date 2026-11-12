/**
 * PDF-отчёт для жюри о создании прототипа с помощью ИИ.
 *
 *   npm run report                          → report/dekanat-ai-report.pdf
 *   REPORT_SITE_URL=https://… npm run report  (ссылка на сайт после деплоя)
 *   REPORT_AUTHOR="Имя Фамилия" npm run report
 *
 * Вёрстка — HTML в палитре прототипа (шрифт Onest вшит), печать в PDF — Chrome через Playwright.
 * Скриншоты берутся из docs/screenshots (npm run screenshots).
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { chromium } from "@playwright/test";

const ROOT = process.cwd();
const OUT = path.join(ROOT, "report", "dekanat-ai-report.pdf");
const SHOTS = path.join(ROOT, "docs", "screenshots");

// ---------- Данные ----------

const site = process.env.REPORT_SITE_URL ?? "ссылка будет добавлена после размещения на сервере";
const author = process.env.REPORT_AUTHOR ?? "";
const repo = (() => {
  const r = spawnSync("git", ["remote", "get-url", "origin"], { encoding: "utf8" });
  const m = r.stdout?.trim().match(/github\.com[:/](.+?)(\.git)?$/);
  return m ? `github.com/${m[1]}` : "—";
})();
const listed = spawnSync("npx", ["playwright", "test", "--project=e2e", "--list"], { shell: true, encoding: "utf8" }).stdout;
const testCount = Number(listed.match(/Total: (\d+) tests/)?.[1] ?? 0);
// Настоящие названия тестов для «терминала» в отчёте
const testTitles = listed
  .split(/\r?\n/)
  .filter((l) => l.includes("[e2e] ›"))
  .map((l) => l.split(" › ").slice(2).join(" › ").trim());
const pickTests = [/чужую заявку/, /кабинет сотрудника, сотрудник/, /5 неудачных/, /от заявки студента/, /перенос пары/, /экраны студента на 360/, /Доступность, тёмная тема › maria/]
  .map((re) => testTitles.find((t) => re.test(t)))
  .filter((t): t is string => !!t);
const countLines = (dir: string, re: RegExp): number =>
  fs.readdirSync(dir, { withFileTypes: true }).reduce((sum, e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return sum + countLines(p, re);
    return re.test(e.name) ? sum + fs.readFileSync(p, "utf8").split("\n").length : sum;
  }, 0);
const appLines = countLines(path.join(ROOT, "src"), /\.(ts|tsx|css)$/);
const pages = (function walk(dir: string): number {
  return fs.readdirSync(dir, { withFileTypes: true }).reduce((n, e) => n + (e.isDirectory() ? walk(path.join(dir, e.name)) : e.name === "page.tsx" ? 1 : 0), 0);
})(path.join(ROOT, "src", "app"));

const shotCount = fs.readdirSync(SHOTS).filter((f) => f.endsWith(".png")).length;

const FONT_DIR = path.join(ROOT, "node_modules", "@fontsource-variable", "onest", "files");
const font = (file: string, range: string) =>
  `@font-face{font-family:"Onest";font-weight:100 900;src:url(data:font/woff2;base64,${fs.readFileSync(path.join(FONT_DIR, file)).toString("base64")}) format("woff2");unicode-range:${range}}`;
const img = (name: string) => `data:image/png;base64,${fs.readFileSync(path.join(SHOTS, `${name}.png`)).toString("base64")}`;
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");

const LOGO = (size = 44) =>
  `<svg viewBox="0 0 64 64" width="${size}" height="${size}"><rect width="64" height="64" rx="16" fill="#244cff"/><path d="M18 46V40h3.5L30 18h4l8.5 22H46v6h-5v-6H23v6zm8-6h12l-6-15.5z" fill="#fff"/><circle cx="47" cy="17" r="5" fill="#ffb547"/></svg>`;

// ---------- Содержание ----------

const STAGES: [string, string, string][] = [
  ["0. Разбор ТЗ", "«Изучи задачу и предложи свои варианты решения»", "Выделил обязательное ядро, требования безопасности и критерии; предложил 3 варианта стека и отговорил от зарубежного хостинга (требование «из России без VPN»). Ответил на вопросы автора: нужен ли хостинг, будет ли защита."],
  ["1. Каркас", "«Давай просто начнём пока разработку»", "Next.js 16 + PostgreSQL; прочитал встроенную документацию новой версии фреймворка, прежде чем писать код. До кода создал документы для агента: CLAUDE.md, PRD, архитектура, безопасность, журнал."],
  ["2. Ядро кабинета", "(продолжение того же запроса)", "Все 5 разделов ТЗ, кабинет сотрудника, вход с argon2id и защитой от перебора, вымышленные данные: 3 студента, 495 занятий, заявки, уведомления. Проверил каждый экран в браузере и на ширине телефона."],
  ["3. Подготовка к хостингу", "«Что мы можем пока сделать без VPS и API-ключа?» → «Давай по этапам»", "Docker Compose (приложение + PostgreSQL + Caddy с автоматическим HTTPS), пошаговая инструкция деплоя с учётом российских реалий, проверка продакшен-сборки без доступа к базе."],
  ["4. Элективы и расписание", "«Да, этап 2»", "Запись на дисциплины по выбору с живыми местами и защитой от гонки; сотрудник переносит и отменяет пары с проверкой пересечений, группа сразу получает уведомление."],
  ["5. Автотесты", "«Да, автотесты»", `${testCount} сценариев Playwright против продакшен-сборки и отдельной базы; автоскриншоты для отчёта. Тесты нашли 2 настоящих бага.`],
  ["6. Дизайн и доступность", "«Да, дизайн»", "Проверка WCAG 2.1 AA (axe) на всех экранах в двух темах; ИИ осмотрел свои скриншоты и нашёл ошибку склонения, наезжающие элементы и перекос раскладки."],
  ["7. Палитра и тема", "Картинка с цветами + «Хочу уйти от фиолетового… сделаем переключатель тёмная/светлая тема»", "Новая палитра подобрана по расчёту контраста; переключатель темы без «мигания» (выбор хранится в cookie). По просьбе «стандартная тема — белая» — светлая по умолчанию."],
  ["8. Демо-видео", "«Давай начнём с видео сценария» → «Сможешь ли ты это реализовать в видео?» → «А мы можем сделать озвучку?»", "Сценарий на 5 минут; браузер сам проходит его и записывает видео 720p; озвучка нейроголосом, синхронная с действиями; видео собирается только после прохождения всех автотестов."],
];

const BUGS: [string, string, string][] = [
  ["Встраиваемая база данных (PGlite) падала при работе сайта", "Логи сервера: Next.js 16 рендерит страницы в нескольких процессах", "Переход на настоящий PostgreSQL, правило записано в CLAUDE.md"],
  ["Кириллица не сохранялась в базе на Windows", "Ошибка при заполнении демо-данных", "Кодировка UTF-8 при создании базы"],
  ["ИИ использовал названия иконок, которых нет в новой версии библиотеки", "Сборка проекта", "Сверка со списком иконок установленной версии"],
  ["Пароли демо-аккаунтов попали в код, который уходит в браузер", "Ревью ИИ собственного кода по правилам безопасности", "Перенос на сервер, отключаемый показ"],
  ["Подсказка «долг по матанализу» противоречила сгенерированным датам", "ИИ сверил текст со скриншотом", "Исправлен генератор данных"],
  ["Подключение к базе создавалось при импорте — сборка в Docker упала бы", "Сборка без доступа к базе", "Ленивое подключение при первом запросе"],
  ["После ошибки форма сотрудника очищала введённые поля", "Проверка в браузере", "Введённые значения возвращаются в форму"],
  ["Чужая заявка отдавала HTTP 200 вместо 404 (данные не утекали)", "Автотест безопасности", "Честный 404: скелетоны загрузки только там, где нет id в адресе"],
  ["Страница входа на экране 360 px была шире экрана (385 px)", "Автотест вёрстки", "Исправлены сетка и карточки демо-аккаунтов"],
  ["Слабый контраст текста в светлой теме (3,9 при норме 4,5)", "Проверка доступности axe", "Цвета подобраны по расчёту контраста"],
  ["«2 пар», «3 пар»; точка изменений наезжала на день недели", "ИИ осмотрел свои скриншоты", "Склонения и раскладка исправлены"],
  ["Сервис озвучки отвечал пустотой на частые запросы", "Проверка фраз по одной", "Отдельный процесс на фразу и повторы"],
];

const TESTS: [string, string][] = [
  ["student", "Обязательное ядро ТЗ: «Сегодня», профиль, расписание и экспорт в календарь, успеваемость, уведомления; пометка «концепт» на каждой странице"],
  ["requests", "Справка целиком: заявка студента → работа сотрудника → уведомление → документ → проверка подлинности; отмена и ответ на уточнение"],
  ["electives", "Лимит выбора, места, отказ; серверная защита от «разблокированной» вручную кнопки"],
  ["staff-schedule", "Перенос, отмена, смена аудитории; пересечения; изменения видят только студенты группы"],
  ["security", "Без входа ничего не открыть; чужая заявка → 404; роли; флаги cookie; выход; блокировка перебора; заголовки; нет секретов в HTML"],
  ["mobile", "Все экраны на ширине 360 px без горизонтальной прокрутки"],
  ["a11y", "Доступность WCAG 2.1 AA на всех экранах в светлой и тёмной теме; навигация с клавиатуры"],
  ["theme", "Переключатель темы: выбор сохраняется и приходит с сервера"],
];

const SECURITY: [string, string, string][] = [
  ["Студент видит только свои данные, даже при подмене адреса", "Все запросы к базе — через слой доступа, который сам берёт пользователя из сессии; чужая запись → 404", "Автотест подставляет id чужой заявки и документа"],
  ["Пароли не хранятся в открытом виде", "Хеш argon2id; одинаковый ответ и время для неверного логина и пароля; блокировка после 5 попыток", "Автотесты входа и перебора"],
  ["Ключи и пароли сервисов не в коде и не в браузере", "Только переменные окружения на сервере, .env не попадает в git; ИИ-сервисы в кабинете не используются", "Автотест: в HTML нет хешей и строк подключения"],
  ["Сессии", "Случайный токен в HttpOnly-cookie, в базе — только его хеш; выход делает cookie недействительной", "Автотест «украденной» cookie после выхода"],
  ["Роли", "Разделы сотрудника проверяют роль на сервере, а не скрывают кнопки", "Автотест: студент не попадает в /staff"],
];

const CORE: [string, string][] = [
  ["Вход и профиль", "логин и пароль, ФИО, факультет, направление, курс, группа"],
  ["Расписание", "сегодня и неделя, аудитория, преподаватель, заметные переносы и отмены, экспорт в календарь"],
  ["Успеваемость", "баллы по дисциплинам, светофор риска, прогноз оценки и стипендии, сессия, прошлые семестры"],
  ["Заявки и справки", "заказ онлайн, статус как трекинг посылки, готовый документ с кодом проверки подлинности"],
  ["Уведомления", "новости, дедлайны, изменения расписания, статусы заявок"],
];

// ---------- Вёрстка ----------

const CSS = `
${font("onest-cyrillic-wght-normal.woff2", "U+0301,U+0400-045F,U+0490-0491,U+04B0-04B1,U+2116")}
${font("onest-latin-wght-normal.woff2", "U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD")}
@page{size:A4;margin:16mm 15mm 18mm;@bottom-left{content:"Мой деканат — концепт для конкурса «Цифровой деканат будущего»";font:7.5pt "Onest",sans-serif;color:#8a9099}@bottom-right{content:counter(page);font:7.5pt "Onest",sans-serif;color:#8a9099}}
@page:first{margin:0;@bottom-left{content:none}@bottom-right{content:none}}
*{box-sizing:border-box}
html{-webkit-print-color-adjust:exact;print-color-adjust:exact}
body{margin:0;font-family:"Onest",system-ui,sans-serif;font-size:10.5pt;line-height:1.5;color:#17191d}
h1,h2,h3{margin:0;letter-spacing:-.01em}
h2{font-size:21pt;line-height:1.15;font-weight:800;margin-bottom:4mm}
h3{font-size:12.5pt;font-weight:700;margin:6mm 0 2mm}
p{margin:0 0 2.5mm}
.kicker{font-size:8.5pt;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#244cff;margin-bottom:2mm}
.page{break-before:page}
.muted{color:#596069}
.lead{font-size:12pt;line-height:1.45;color:#3a3f47;margin-bottom:5mm}
table{width:100%;border-collapse:collapse;font-size:9.4pt}
th{text-align:left;font-size:7.8pt;letter-spacing:.06em;text-transform:uppercase;color:#596069;font-weight:700;padding:0 2.5mm 2mm;border-bottom:1.5px solid #17191d}
td{vertical-align:top;padding:2.4mm 2.5mm;border-bottom:1px solid #d7dce0}
tr{break-inside:avoid}
td b{font-weight:700}
.q{color:#244cff;font-weight:600}
table.tight{font-size:8.9pt;line-height:1.42}
table.tight td{padding:1.9mm 2.2mm}
.card{border:1px solid #d7dce0;border-radius:4mm;padding:4mm 5mm;background:#fff;break-inside:avoid}
.soft{background:#f2f4f5;border:none}
.grid2{display:grid;grid-template-columns:1fr 1fr;gap:4mm}
.grid3{display:grid;grid-template-columns:repeat(3,1fr);gap:4mm}
.stats{display:grid;grid-template-columns:repeat(4,1fr);gap:3mm;margin:4mm 0 2mm}
.stat{background:#244cff;color:#fff;border-radius:4mm;padding:3.5mm 4mm}
.stat b{display:block;font-size:20pt;line-height:1.1;font-weight:800}
.stat span{font-size:8.5pt;opacity:.9}
.ok{color:#0f7a40;font-weight:700}
ul.clean{margin:0;padding-left:4.5mm}
ul.clean li{margin-bottom:1.2mm}
.flow{display:flex;align-items:stretch;gap:2mm;margin:3mm 0 4mm}
.flow div{flex:1;background:#e6ebff;border-radius:3mm;padding:3mm;font-size:9pt;line-height:1.35}
.flow div b{display:block;color:#244cff;font-size:9.5pt;margin-bottom:1mm}
.flow i{align-self:center;color:#244cff;font-style:normal;font-weight:800}
pre{margin:0;background:#17191d;color:#e8ebed;border-radius:3.5mm;padding:4mm 5mm;font:8.6pt/1.55 Consolas,"Cascadia Mono",monospace;white-space:pre-wrap}
pre .c{color:#9aa1ab} pre .g{color:#4fd18b} pre .b{color:#7a92ff}
figure{margin:0;text-align:center;break-inside:avoid}
figure img{width:100%;border-radius:3mm;border:1px solid #d7dce0;display:block}
figcaption{font-size:8.5pt;color:#596069;margin-top:1.5mm}
.phone img{border:2.2mm solid #17191d;border-radius:5mm}
.cover{height:297mm;padding:22mm 20mm;background:linear-gradient(140deg,#244cff,#0f2399);color:#fff;position:relative;overflow:hidden;display:flex;flex-direction:column}
.cover .circle{position:absolute;border-radius:50%;background:rgba(255,255,255,.08)}
.cover h1{font-size:40pt;line-height:1.02;font-weight:800;margin:14mm 0 5mm;letter-spacing:-.02em}
.cover .sub{font-size:15pt;line-height:1.35;opacity:.95;max-width:150mm}
.cover .box{margin-top:auto;background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.25);border-radius:5mm;padding:6mm 7mm;display:grid;grid-template-columns:1fr 1fr;gap:6mm;font-size:10pt}
.cover .box p{margin:0 0 3mm}
.cover .box .lbl{font-size:8pt;text-transform:uppercase;letter-spacing:.08em;opacity:.75;margin-bottom:.5mm}
.cover table td{border-bottom:1px solid rgba(255,255,255,.2);padding:1.6mm 0;color:#fff}
.cover table td{font-size:9pt}
.cover table td:last-child{text-align:right;font-family:Consolas,monospace;white-space:nowrap;padding-left:3mm}
.note{font-size:9pt;opacity:.8;margin-top:6mm}
`;

const H = String.raw;

const cover = H`
<section class="cover">
  <div class="circle" style="width:150mm;height:150mm;right:-50mm;top:-60mm"></div>
  <div class="circle" style="width:90mm;height:90mm;left:-35mm;bottom:40mm;background:rgba(255,255,255,.05)"></div>
  <div style="display:flex;align-items:center;gap:4mm;position:relative">${LOGO(52)}<span style="font-size:19pt;font-weight:700">Мой деканат</span></div>
  <h1 style="position:relative">Цифровой деканат<br>будущего</h1>
  <p class="sub" style="position:relative">Отчёт о создании прототипа личного кабинета студента с помощью ИИ: как была устроена работа, промпты, ошибки ИИ и проверки</p>
  <div class="box" style="position:relative">
    <div>
      <p><span class="lbl" style="display:block">Сайт</span><b>${esc(site)}</b></p>
      <p><span class="lbl" style="display:block">Код</span><b>${esc(repo)}</b></p>
      <p><span class="lbl" style="display:block">Видео</span><b>прилагается к работе (4:41, с озвучкой)</b></p>
      ${author ? `<p><span class="lbl" style="display:block">Автор</span><b>${esc(author)}</b></p>` : ""}
    </div>
    <div>
      <span class="lbl" style="display:block;margin-bottom:1mm">Тестовые аккаунты</span>
      <table>
        <tr><td>Студентка, отличница</td><td>maria / maria2026</td></tr>
        <tr><td>Студент с рисками</td><td>daniil / daniil2026</td></tr>
        <tr><td>Первокурсник, контракт</td><td>artem / artem2026</td></tr>
        <tr><td>Сотрудник деканата</td><td>dekanat / dekanat2026</td></tr>
      </table>
    </div>
  </div>
  <p class="note" style="position:relative">Концепт для конкурса «Цифровой деканат будущего». Не официальный сервис вуза. Все данные вымышленные. Ноябрь 2026.</p>
</section>`;

const summary = H`
<section class="page">
  <div class="kicker">Идея</div>
  <h2>Коротко о проекте</h2>
  <p class="lead">Расписание — на одном сайте, оценки — в другом, за справкой — очередь в деканат, а о переносе пары студент узнаёт у закрытой аудитории. «Мой деканат» собирает всё в одном кабинете и за пару касаний отвечает на три вопроса: <b>что у меня сейчас</b>, <b>как дела с учёбой</b> и <b>как получить документ без очереди</b>.</p>
  <div class="stats">
    <div class="stat"><b>${pages}</b><span>экранов студента и сотрудника</span></div>
    <div class="stat"><b>${(Math.round(appLines / 100) * 100).toLocaleString("ru-RU")}</b><span>строк кода приложения — все написал ИИ</span></div>
    <div class="stat"><b>${testCount}</b><span>автотестов: сценарии, безопасность, вёрстка</span></div>
    <div class="stat"><b>${STAGES.length}</b><span>этапов работы, каждый — в журнале</span></div>
  </div>
  <h3>Обязательное ядро из ТЗ</h3>
  <table>
    <tr><th style="width:30%">Раздел</th><th>Что внутри</th><th style="width:12%">Статус</th></tr>
    ${CORE.map(([a, b]) => `<tr><td><b>${a}</b></td><td>${b}</td><td class="ok">готово</td></tr>`).join("")}
  </table>
  <h3>Сверх ядра</h3>
  <div class="grid2">
    <ul class="clean">
      <li><b>Экран «Сегодня»</b> — текущая пара с обратным отсчётом, изменения, дедлайны, заявки</li>
      <li><b>Светофор успеваемости</b> — риск долга по каждой дисциплине и прогноз стипендии</li>
      <li><b>Заявка как посылка</b> и проверка подлинности справки по коду без входа</li>
      <li><b>Запись на элективы</b> с живым счётчиком мест</li>
    </ul>
    <ul class="clean">
      <li><b>Кабинет сотрудника</b>: очередь заявок, объявления, перенос и отмена пар с проверкой пересечений</li>
      <li><b>Мгновенные уведомления</b> студентам при любом изменении</li>
      <li><b>Светлая и тёмная тема</b>, вёрстка с 360 px, доступность WCAG 2.1 AA</li>
      <li><b>Экспорт расписания</b> в календарь телефона</li>
    </ul>
  </div>
</section>`;

const process_ = H`
<section class="page">
  <div class="kicker">Масштаб ИИ</div>
  <h2>Как была устроена работа с ИИ</h2>
  <p class="lead">Весь код, тесты, документация, скриншоты и видео созданы ИИ-агентом <b>Claude Code</b> (приложение Claude, модель Claude Opus). Агент сам читает и пишет файлы проекта, запускает команды, открывает сайт во встроенном браузере и смотрит скриншоты. Задачи ставил, решения принимал и результат проверял автор проекта.</p>
  <h3>Цикл каждого этапа</h3>
  <div class="flow">
    <div><b>1. Задача</b>обычными словами, без технического задания для ИИ</div><i>→</i>
    <div><b>2. План</b>ИИ предлагает варианты, задаёт вопросы, автор выбирает</div><i>→</i>
    <div><b>3. Код</b>ИИ пишет код по правилам из инструкции</div><i>→</i>
    <div><b>4. Проверка</b>типы, линтер, автотесты, браузер, скриншоты</div><i>→</i>
    <div><b>5. Журнал</b>промпт, решения и ошибки ИИ — в docs/ai-log.md</div>
  </div>
  <div class="grid2" style="align-items:start">
    <div>
      <h3 style="margin-top:2mm">Документы для агента</h3>
      <p>Чтобы ИИ не терял контекст между сессиями и не нарушал требования ТЗ, до первой строки кода появились документы, которые агент читает перед работой:</p>
      <ul class="clean">
        <li><b>CLAUDE.md</b> — стек, команды и правила кода</li>
        <li><b>PRD</b> — что и зачем строим, сценарии для жюри</li>
        <li><b>architecture.md</b> — устройство, модель данных, решения</li>
        <li><b>security.md</b> — как выполнено каждое требование безопасности</li>
        <li><b>ai-log.md</b> — журнал: из него собран этот отчёт</li>
      </ul>
      <p style="margin-top:3mm">Когда ИИ ошибался в чём-то принципиальном, правило дописывалось в CLAUDE.md, чтобы ошибка не повторилась.</p>
    </div>
    <div>
      <h3 style="margin-top:2mm">Фрагмент CLAUDE.md</h3>
<pre><span class="c">## Правила кода</span>
- Любой доступ к данным — только через
  src/lib/dal/*. Никогда не принимай
  studentId из URL, формы или клиента.
- Чужая запись = notFound() (404), а не 403.
- Server Actions валидируют вход через zod.
- Секреты — только в переменных окружения.
- Только вымышленные данные.
- Мобильная вёрстка с 360 px.
- Доступность WCAG 2.1 AA.
<span class="c">## Журнал</span>
После этапа дополни docs/ai-log.md:
что просили, решение, что пошло не так.</pre>
    </div>
  </div>
</section>`;

const stages = H`
<section class="page">
  <div class="kicker">Масштаб ИИ</div>
  <h2>Этапы и промпты</h2>
  <p class="lead">Промпты короткие и разговорные: детали ИИ уточнял сам вопросами и предлагал варианты. Ниже — реальные запросы автора по этапам.</p>
  <table class="tight">
    <tr><th style="width:17%">Этап</th><th style="width:30%">Промпт автора</th><th>Что сделал ИИ</th></tr>
    ${STAGES.map(([s, q, d]) => `<tr><td><b>${s}</b></td><td class="q">${esc(q)}</td><td>${esc(d)}</td></tr>`).join("")}
  </table>
  <p class="muted" style="margin-top:4mm">Принципиальные решения ИИ выносил на выбор автора: какой стек, где хостинг, делать ли ИИ-помощника в кабинете (отложен — ТЗ его не требует), какую палитру и тему по умолчанию, чем озвучить видео.</p>
</section>`;

const bugs = H`
<section class="page">
  <div class="kicker">Масштаб ИИ</div>
  <h2>Ошибки ИИ — и как их поймали</h2>
  <p class="lead">ИИ ошибался. Важно, что большинство ошибок поймали <b>не глазами автора, а проверками</b>, которые ИИ сам построил: сборка, автотесты, проверка доступности и осмотр собственных скриншотов.</p>
  <table>
    <tr><th style="width:38%">Что пошло не так</th><th style="width:28%">Чем поймали</th><th>Как исправлено</th></tr>
    ${BUGS.map(([a, b, c]) => `<tr><td>${esc(a)}</td><td style="color:#a15405;font-weight:600">${esc(b)}</td><td style="color:#0f7a40">${esc(c)}</td></tr>`).join("")}
  </table>
</section>`;

const quality = H`
<section class="page">
  <div class="kicker">Качество</div>
  <h2>Как ИИ проверял сам себя</h2>
  <p class="lead">Код, написанный ИИ, нельзя принимать на веру. Поэтому ИИ написал ${testCount} автотестов Playwright: они открывают <b>продакшен-сборку</b> в браузере и проходят сценарии как человек — на отдельной базе, которая пересоздаётся перед каждым прогоном.</p>
  <table>
    <tr><th style="width:18%">Файл</th><th>Что проверяет</th></tr>
    ${TESTS.map(([f, d]) => `<tr><td><b>${f}</b></td><td>${esc(d)}</td></tr>`).join("")}
  </table>
  <div class="grid2" style="margin-top:5mm;align-items:start">
<pre><span class="b">$</span> npm run test:e2e
${pickTests.map((t) => `<span class="g">✓</span> ${esc(t)}`).join(String.fromCharCode(10))}
<span class="c">  … и ещё ${testCount - pickTests.length}</span>
<span class="g">  ${testCount} passed</span></pre>
    <div>
      <ul class="clean">
        <li><b>Первый прогон: 29 из 38.</b> Шесть падений — ошибки самих тестов, но два — настоящие баги приложения, которые не заметила ручная проверка: «200 вместо 404» и вёрстка входа на 360 px.</li>
        <li><b>Доступность:</b> axe-core проверяет контраст, подписи полей и имена кнопок на всех экранах в обеих темах.</li>
        <li><b>Скриншоты:</b> ${shotCount} экранов снимаются автоматически; ИИ просматривал их сам и находил недочёты.</li>
        <li><b>Видео</b> собирается только после того, как прошли все автотесты.</li>
      </ul>
    </div>
  </div>
</section>`;

const security = H`
<section class="page">
  <div class="kicker">Качество</div>
  <h2>Безопасность</h2>
  <p class="lead">Каждое требование ТЗ к безопасности выполнено в коде и закреплено автотестом — так оно не сломается при следующей правке ИИ.</p>
  <table>
    <tr><th style="width:26%">Требование ТЗ</th><th>Как выполнено</th><th style="width:26%">Чем проверено</th></tr>
    ${SECURITY.map(([a, b, c]) => `<tr><td><b>${esc(a)}</b></td><td>${esc(b)}</td><td>${esc(c)}</td></tr>`).join("")}
  </table>
  <h3>Технологии</h3>
  <div class="grid3">
    <div class="card soft"><b>Приложение</b><br>Next.js 16, React 19, TypeScript, Tailwind CSS 4</div>
    <div class="card soft"><b>Данные</b><br>PostgreSQL, Drizzle ORM, миграции, вымышленные демо-данные</div>
    <div class="card soft"><b>Запуск</b><br>Docker Compose + Caddy (HTTPS), российский VPS — доступ без VPN</div>
  </div>
</section>`;

const phones = H`
<section class="page">
  <div class="kicker">Экраны</div>
  <h2>Кабинет студента на телефоне</h2>
  <div class="phone" style="display:grid;grid-template-columns:repeat(4,1fr);gap:5mm 4mm;margin-top:3mm">
    <figure><img src="${img("m02-today")}"><figcaption>«Сегодня»</figcaption></figure>
    <figure><img src="${img("m03-schedule")}"><figcaption>Расписание недели</figcaption></figure>
    <figure><img src="${img("m11-grades-risk")}"><figcaption>Светофор: риск долга</figcaption></figure>
    <figure><img src="${img("m05-electives")}"><figcaption>Запись на элективы</figcaption></figure>
    <figure><img src="${img("m06-request-catalog")}"><figcaption>Каталог справок</figcaption></figure>
    <figure><img src="${img("m08-request-ready")}"><figcaption>Заявка как посылка</figcaption></figure>
    <figure><img src="${img("m09-notifications")}"><figcaption>Уведомления</figcaption></figure>
    <figure><img src="${img("m20-today-dark")}"><figcaption>Тёмная тема</figcaption></figure>
  </div>
</section>`;

const desktop = H`
<section class="page">
  <div class="kicker">Экраны</div>
  <h2>На компьютере</h2>
  <figure style="margin-bottom:6mm"><img src="${img("d02-schedule")}"><figcaption>Расписание студента: изменения недели сразу видны</figcaption></figure>
  <figure><img src="${img("d21-verify")}"><figcaption>Проверка подлинности справки по коду — без входа в систему</figcaption></figure>
</section>
<section class="page">
  <div class="kicker">Экраны</div>
  <h2>Кабинет сотрудника деканата</h2>
  <figure style="margin-bottom:6mm"><img src="${img("d11-staff-request")}"><figcaption>Обработка заявки: статус меняется — студент сразу получает уведомление</figcaption></figure>
  <figure><img src="${img("d13-staff-lesson-edit")}"><figcaption>Перенос пары: подсказка свободных аудиторий и уведомление всей группе</figcaption></figure>
</section>`;

const outro = H`
<section class="page">
  <div class="kicker">Итоги</div>
  <h2>Что получилось и что дальше</h2>
  <div class="grid2" style="align-items:start">
    <div>
      <h3 style="margin-top:0">Выводы о работе с ИИ</h3>
      <ul class="clean">
        <li><b>ИИ — исполнитель, человек — заказчик.</b> Короткие разговорные промпты работали, потому что ИИ сам задавал уточняющие вопросы и выносил решения на выбор.</li>
        <li><b>Инструкция для агента важнее промпта.</b> Правила в CLAUDE.md держали качество и безопасность на всех этапах.</li>
        <li><b>Доверять можно только проверенному.</b> Автотесты, проверка доступности и скриншоты нашли ошибки, которые человек бы пропустил.</li>
        <li><b>ИИ полезен не только для кода:</b> анализ ТЗ, документация, данные, дизайн по расчёту контраста, сценарий и озвучка видео, этот отчёт.</li>
      </ul>
    </div>
    <div>
      <h3 style="margin-top:0">Что можно развить</h3>
      <ul class="clean">
        <li><b>ИИ-помощник деканата</b> — ответы на вопросы студентов и помощь с заявлениями. Отложен: ТЗ его не требует, а внешний ИИ-сервис — лишняя зависимость; ключ хранился бы только на сервере.</li>
        <li><b>Установка на телефон</b> и работа без сети для расписания.</li>
        <li><b>Подключение к реальным системам вуза</b> вместо демо-данных.</li>
      </ul>
      <div class="card" style="margin-top:6mm">
        <b>Как проверить самостоятельно</b>
        <p style="margin:2mm 0 0">Сайт: ${esc(site)}<br>Код: ${esc(repo)}<br>Войдите под любым тестовым аккаунтом со страницы входа — логины и пароли показаны прямо там.</p>
      </div>
    </div>
  </div>
</section>`;

const html = `<!doctype html><html lang="ru"><head><meta charset="utf-8"><title>Мой деканат — отчёт о работе с ИИ</title><style>${CSS}</style></head><body>
${cover}${summary}${process_}${stages}${bugs}${quality}${security}${phones}${desktop}${outro}
</body></html>`;

// ---------- Печать ----------

async function main() {
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  const browser = await chromium.launch(process.env.PW_BUNDLED ? {} : { channel: "chrome" });
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: "load" });
  await page.evaluate(() => document.fonts.ready);
  await page.pdf({
    path: OUT,
    format: "A4",
    printBackground: true,
    preferCSSPageSize: true,
  });
  await browser.close();
  console.log(`Отчёт: ${OUT}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
