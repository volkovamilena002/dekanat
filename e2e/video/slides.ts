import fs from "node:fs";
import path from "node:path";

/** Слайды для видео: обычный HTML 1280×720 в фирменной палитре, шрифт Onest вшит. */

const FONT_DIR = path.join(process.cwd(), "node_modules", "@fontsource-variable", "onest", "files");
const font = (file: string, range: string) =>
  `@font-face{font-family:"Onest";font-weight:100 900;src:url(data:font/woff2;base64,${fs
    .readFileSync(path.join(FONT_DIR, file))
    .toString("base64")}) format("woff2");unicode-range:${range}}`;

const FONTS =
  font("onest-cyrillic-wght-normal.woff2", "U+0301,U+0400-045F,U+0490-0491,U+04B0-04B1,U+2116") +
  font("onest-latin-wght-normal.woff2", "U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD");

const LOGO = `<svg viewBox="0 0 64 64" width="56" height="56"><rect width="64" height="64" rx="16" fill="#244cff"/><path d="M18 46V40h3.5L30 18h4l8.5 22H46v6h-5v-6H23v6zm8-6h12l-6-15.5z" fill="#fff"/><circle cx="47" cy="17" r="5" fill="#ffb547"/></svg>`;

const BASE = `${FONTS}
*{box-sizing:border-box;margin:0}
html,body{width:1280px;height:720px;overflow:hidden}
body{font-family:"Onest",system-ui,sans-serif;-webkit-font-smoothing:antialiased}
.blue{background:linear-gradient(135deg,#244cff,#0f2399);color:#fff}
.dark{background:#17191d;color:#e8ebed}
.light{background:#e8ebed;color:#17191d}
.wrap{position:relative;height:100%;padding:64px 80px;display:flex;flex-direction:column}
.kicker{font-size:18px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;opacity:.8}
h1{font-size:64px;line-height:1.05;font-weight:800;letter-spacing:-.02em}
h2{font-size:44px;line-height:1.1;font-weight:800;letter-spacing:-.01em}
.sub{font-size:26px;line-height:1.35;opacity:.9}
.note{font-size:17px;opacity:.75}
.circle{position:absolute;border-radius:50%;background:rgba(255,255,255,.08)}
.fade{opacity:0;animation:fade .5s ease forwards}
@keyframes fade{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
.cap{position:absolute;left:50%;bottom:26px;transform:translateX(-50%);width:max-content;max-width:1000px;padding:12px 22px;border-radius:14px;background:rgba(23,25,29,.9);color:#fff;font-size:21px;font-weight:500;line-height:1.38;text-align:center}
`;

export function slideHtml(body: string, theme: "blue" | "dark" | "light" = "dark") {
  return `<!doctype html><html lang="ru"><head><meta charset="utf-8"><style>${BASE}</style></head><body class="${theme}">${body}</body></html>`;
}

export const titleSlide = () =>
  slideHtml(
    `<div class="circle" style="width:620px;height:620px;right:-160px;top:-200px"></div>
     <div class="circle" style="width:380px;height:380px;left:-120px;bottom:-180px;background:rgba(255,255,255,.05)"></div>
     <div class="wrap" style="justify-content:center;gap:28px">
       <div class="fade" style="display:flex;align-items:center;gap:16px">${LOGO}<span style="font-size:30px;font-weight:700">Мой деканат</span></div>
       <h1 class="fade" style="animation-delay:.2s;max-width:900px">Цифровой деканат будущего</h1>
       <p class="sub fade" style="animation-delay:.4s;max-width:820px">Концепт личного кабинета студента: расписание, учёба, справки и новости деканата — в одном месте и без очередей</p>
       <p class="note fade" style="animation-delay:.6s">Прототип для конкурса · не официальный сервис вуза · все данные вымышленные</p>
     </div>`,
    "blue",
  );

/** Скриншоты телефона рядом (data URL) */
export function phonesSlide(images: { file: string; label: string }[], caption: string) {
  const imgs = images
    .filter((i) => fs.existsSync(i.file))
    .map(
      (i, k) => `<figure class="fade" style="animation-delay:${0.15 * k}s;text-align:center">
        <img src="data:image/png;base64,${fs.readFileSync(i.file).toString("base64")}" style="height:500px;border-radius:28px;box-shadow:0 18px 50px rgba(23,25,29,.22);border:6px solid #17191d">
        <figcaption style="margin-top:12px;font-size:17px;font-weight:600">${i.label}</figcaption></figure>`,
    )
    .join("");
  return slideHtml(
    `<div class="wrap" style="padding:36px 60px;align-items:center">
       <div style="display:flex;gap:44px;justify-content:center">${imgs}</div>
     </div><div class="cap">${caption}</div>`,
    "light",
  );
}

export function bulletsSlide(kicker: string, title: string, items: string[], caption: string) {
  const li = items
    .map(
      (t, k) => `<li class="fade" style="animation-delay:${0.25 + k * 0.35}s;display:flex;gap:18px;align-items:flex-start">
        <span style="flex:none;width:34px;height:34px;border-radius:10px;background:#244cff;color:#fff;display:grid;place-items:center;font-weight:700;font-size:17px">${k + 1}</span>
        <span style="font-size:24px;line-height:1.4">${t}</span></li>`,
    )
    .join("");
  return slideHtml(
    `<div class="wrap" style="padding-top:56px;gap:30px">
       <div><p class="kicker" style="color:#7a92ff">${kicker}</p><h2 style="margin-top:10px">${title}</h2></div>
       <ul style="list-style:none;padding:0;display:grid;gap:20px;max-width:1060px">${li}</ul>
     </div><div class="cap">${caption}</div>`,
    "dark",
  );
}

/** «Ошибка ИИ → чем поймали → как исправлено» */
export function bugsSlide(rows: [string, string, string][], caption: string) {
  const tr = rows
    .map(
      ([bug, how, fix], k) => `<div class="fade" style="animation-delay:${0.25 + k * 0.4}s;display:grid;grid-template-columns:1.25fr .8fr 1.1fr;gap:18px;align-items:center;padding:16px 20px;border-radius:16px;background:#1f2228;border:1px solid #33373e">
        <span style="font-size:20px;line-height:1.35">${bug}</span>
        <span style="font-size:16px;font-weight:600;color:#f3b25a">${how}</span>
        <span style="font-size:19px;line-height:1.35;color:#4fd18b">${fix}</span></div>`,
    )
    .join("");
  return slideHtml(
    `<div class="wrap" style="padding-top:48px;gap:22px">
       <div><p class="kicker" style="color:#7a92ff">Масштаб ИИ</p><h2 style="margin-top:10px">Ошибки ИИ ловили проверками, а не глазами</h2></div>
       <div style="display:grid;grid-template-columns:1.25fr .8fr 1.1fr;gap:18px;padding:0 20px;font-size:14px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:#9aa1ab"><span>Что пошло не так</span><span>Чем поймали</span><span>Как исправлено</span></div>
       <div style="display:grid;gap:12px">${tr}</div>
     </div><div class="cap">${caption}</div>`,
    "dark",
  );
}

/** Окно терминала с настоящим списком автотестов */
export function terminalSlide(command: string, lines: string[], summary: string, caption: string) {
  const step = Math.min(0.09, 6 / Math.max(lines.length, 1));
  const ls = lines
    .map((l, k) => `<div class="fade" style="animation-delay:${0.6 + k * step}s;animation-duration:.15s"><span style="color:#4fd18b">✓</span> ${l}</div>`)
    .join("");
  return slideHtml(
    `<div class="wrap" style="padding:44px 80px 120px;gap:18px">
       <div><p class="kicker" style="color:#7a92ff">Качество</p><h2 style="margin-top:8px">Автотесты одной командой</h2></div>
       <div style="flex:1;min-height:0;border-radius:16px;background:#0e0f12;border:1px solid #33373e;overflow:hidden;display:flex;flex-direction:column">
         <div style="display:flex;gap:8px;padding:12px 16px;border-bottom:1px solid #26292f"><i style="width:12px;height:12px;border-radius:50%;background:#ff5f57"></i><i style="width:12px;height:12px;border-radius:50%;background:#febc2e"></i><i style="width:12px;height:12px;border-radius:50%;background:#28c840"></i></div>
         <div style="flex:1;min-height:0;padding:14px 20px;font:15px/1.55 Consolas,'Cascadia Mono',monospace;color:#c9ced6;display:flex;flex-direction:column;justify-content:flex-end;overflow:hidden">
           <div><span style="color:#7a92ff">$</span> ${command}</div>${ls}
           <div class="fade" style="animation-delay:${0.8 + lines.length * step}s;margin-top:8px;color:#4fd18b;font-weight:700">${summary}</div>
         </div>
       </div>
     </div><div class="cap">${caption}</div>`,
    "dark",
  );
}

export function finalSlide(site: string, repo: string | null) {
  const accounts = [
    ["Студентка, отличница", "maria / maria2026"],
    ["Студент с рисками", "daniil / daniil2026"],
    ["Первокурсник, контракт", "artem / artem2026"],
    ["Сотрудник деканата", "dekanat / dekanat2026"],
  ]
    .map(([w, l]) => `<div style="display:flex;justify-content:space-between;gap:24px;padding:10px 0;border-bottom:1px solid rgba(255,255,255,.18)"><span>${w}</span><span style="font-family:Consolas,monospace">${l}</span></div>`)
    .join("");
  return slideHtml(
    `<div class="circle" style="width:560px;height:560px;right:-180px;top:-220px"></div>
     <div class="wrap" style="justify-content:center;gap:26px">
       <div class="fade" style="display:flex;align-items:center;gap:16px">${LOGO}<span style="font-size:30px;font-weight:700">Мой деканат</span></div>
       <h2 class="fade" style="animation-delay:.15s">Попробуйте сами</h2>
       <div class="fade" style="animation-delay:.3s;display:grid;grid-template-columns:1fr 1fr;gap:48px;align-items:start">
         <div style="display:grid;gap:14px;font-size:22px">
           <div><p class="note">Сайт</p><p style="font-weight:700">${site}</p></div>
           ${repo ? `<div><p class="note">Код</p><p style="font-weight:700">${repo}</p></div>` : ""}
           <p class="note" style="margin-top:6px">Концепт для конкурса · данные вымышленные</p>
         </div>
         <div style="font-size:19px"><p class="note" style="margin-bottom:6px">Тестовые аккаунты</p>${accounts}</div>
       </div>
     </div>`,
    "blue",
  );
}
