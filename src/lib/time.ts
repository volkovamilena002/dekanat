// Даты в часовом поясе Москвы. Даты расписания хранятся строками YYYY-MM-DD,
// вся арифметика — через UTC-полночь, чтобы не зависеть от часового пояса сервера.

export const TZ = "Europe/Moscow";

export const PAIRS: Record<number, { start: string; end: string }> = {
  1: { start: "08:30", end: "10:00" },
  2: { start: "10:10", end: "11:40" },
  3: { start: "12:10", end: "13:40" },
  4: { start: "13:50", end: "15:20" },
  5: { start: "15:30", end: "17:00" },
  6: { start: "17:10", end: "18:40" },
  7: { start: "18:50", end: "20:20" },
};

function mskParts(d = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)!.value;
  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    minutes: Number(get("hour")) * 60 + Number(get("minute")),
  };
}

/** Сегодняшняя дата в Москве, YYYY-MM-DD */
export const todayMsk = () => mskParts().date;
/** Минуты от полуночи по Москве */
export const minutesNowMsk = () => mskParts().minutes;

const toUtc = (s: string) => new Date(`${s}T00:00:00Z`);
const fromUtc = (d: Date) => d.toISOString().slice(0, 10);

export function addDays(date: string, n: number) {
  const d = toUtc(date);
  d.setUTCDate(d.getUTCDate() + n);
  return fromUtc(d);
}

/** День недели: 1 = понедельник … 7 = воскресенье */
export function weekday(date: string) {
  const w = toUtc(date).getUTCDay();
  return w === 0 ? 7 : w;
}

export const startOfWeek = (date: string) => addDays(date, 1 - weekday(date));

export function daysBetween(a: string, b: string) {
  return Math.round((toUtc(b).getTime() - toUtc(a).getTime()) / 86400000);
}

export const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

const WEEKDAYS_SHORT = ["пн", "вт", "ср", "чт", "пт", "сб", "вс"];
const WEEKDAYS_LONG = ["понедельник", "вторник", "среда", "четверг", "пятница", "суббота", "воскресенье"];
const MONTHS_GEN = [
  "января", "февраля", "марта", "апреля", "мая", "июня",
  "июля", "августа", "сентября", "октября", "ноября", "декабря",
];

export const weekdayShort = (date: string) => WEEKDAYS_SHORT[weekday(date) - 1];
export const weekdayLong = (date: string) => WEEKDAYS_LONG[weekday(date) - 1];

/** «11 ноября» */
export function formatDay(date: string) {
  const [, m, d] = date.split("-").map(Number);
  return `${d} ${MONTHS_GEN[m - 1]}`;
}

/** «среда, 11 ноября» */
export const formatDayLong = (date: string) => `${weekdayLong(date)}, ${formatDay(date)}`;

/** Относительная подпись: «сегодня», «завтра», «вчера» или «пт, 13 ноября» */
export function relativeDay(date: string, today = todayMsk()) {
  const diff = daysBetween(today, date);
  if (diff === 0) return "сегодня";
  if (diff === 1) return "завтра";
  if (diff === -1) return "вчера";
  return `${weekdayShort(date)}, ${formatDay(date)}`;
}

/** Дата-время (timestamp) → «11 ноября, 14:05» по Москве */
export function formatDateTime(d: Date) {
  const { date, minutes } = mskParts(d);
  const hh = String(Math.floor(minutes / 60)).padStart(2, "0");
  const mm = String(minutes % 60).padStart(2, "0");
  return `${formatDay(date)}, ${hh}:${mm}`;
}

export const dateMsk = (d: Date) => mskParts(d).date;

/** Склонение: plural(3, ["день", "дня", "дней"]) */
export function plural(n: number, forms: [string, string, string]) {
  const a = Math.abs(n) % 100;
  const b = a % 10;
  if (a > 10 && a < 20) return forms[2];
  if (b > 1 && b < 5) return forms[1];
  if (b === 1) return forms[0];
  return forms[2];
}
