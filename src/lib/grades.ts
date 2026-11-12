// Расчёты успеваемости (балльно-рейтинговая система, 100 баллов на дисциплину).
// Чистые функции — без доступа к БД.

type Item = { maxScore: number; score: number | null; dueDate: string | null; title: string };
type CourseLike = {
  controlType: "exam" | "credit" | "graded_credit" | "coursework";
  finalMark: string | null;
  items: Item[];
};

export type Light = "green" | "yellow" | "red" | "gray";

export const CONTROL_LABEL = {
  exam: "Экзамен",
  credit: "Зачёт",
  graded_credit: "Дифзачёт",
  coursework: "Курсовая",
} as const;

export function analyzeCourse(c: CourseLike, today: string) {
  const earned = c.items.reduce((s, i) => s + (i.score ?? 0), 0);
  const isFinal = (i: Item) => c.controlType === "exam" && i.title === "Экзамен";
  // «сколько можно было набрать к сегодняшнему дню»
  const due = c.items.filter((i) => i.dueDate && i.dueDate < today);
  const possible = due.reduce((s, i) => s + i.maxScore, 0);
  const overdue = due.filter((i) => i.score === null);
  const semesterMax = c.items.filter((i) => !isFinal(i)).reduce((s, i) => s + i.maxScore, 0);
  const semesterEarned = c.items.filter((i) => !isFinal(i)).reduce((s, i) => s + (i.score ?? 0), 0);
  const ratio = possible ? earned / possible : null;

  let light: Light = "gray";
  if (ratio !== null) light = overdue.length || ratio < 0.6 ? "red" : ratio < 0.75 ? "yellow" : "green";

  // Порог допуска к экзамену — 50% баллов семестра; зачёт — 60 из 100
  const admissionThreshold = Math.ceil(semesterMax * 0.5);
  const creditThreshold = 60;

  // Прогноз: текущий темп переносим на оставшиеся баллы
  const projected = ratio === null ? null : Math.round(ratio * 100);

  return {
    earned,
    possible,
    ratio,
    light,
    overdue,
    semesterEarned,
    semesterMax,
    admissionThreshold,
    creditThreshold,
    projected,
    predictedMark: projected === null ? null : markFor(c.controlType, projected),
    nextItem: c.items.find((i) => i.score === null && i.dueDate && i.dueDate >= today) ?? null,
  };
}

export function markFor(control: CourseLike["controlType"], points: number) {
  if (control === "credit") return points >= 60 ? "зачтено" : "не зачтено";
  if (points >= 85) return "5";
  if (points >= 70) return "4";
  if (points >= 55) return "3";
  return "2";
}

export const MARK_LABEL: Record<string, string> = {
  "5": "отлично",
  "4": "хорошо",
  "3": "удовл.",
  "2": "неуд.",
  зачтено: "зачтено",
  "не зачтено": "не зачтено",
};

/** Средний балл по оценкам (только числовые) */
export function gpa(marks: (string | null)[]) {
  const nums = marks.map(Number).filter((n) => n >= 2 && n <= 5);
  if (!nums.length) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}
