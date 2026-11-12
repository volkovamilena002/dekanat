/**
 * Применяет миграции и заполняет БД ВЫМЫШЛЕННЫМИ данными.
 * Все ФИО, номера зачёток и оценки придуманы. Совпадения случайны.
 *
 *   npm run db:setup  — пересоздать данные (берёт DATABASE_URL из окружения или .env.local)
 */
import path from "node:path";
import { randomBytes } from "node:crypto";
import { sql } from "drizzle-orm";
import * as schema from "../src/db/schema";
import { hashPassword } from "../src/lib/auth/password";
import { addDays, startOfWeek, todayMsk, weekday, weekdayShort, PAIRS } from "../src/lib/time";

const MIGRATIONS = path.join(process.cwd(), "src", "db", "migrations");

async function connect() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL не задан. Локально используйте `npm run dev:local` (он сам создаст .env.local).");
  }
  const { drizzle } = await import("drizzle-orm/node-postgres");
  const { migrate } = await import("drizzle-orm/node-postgres/migrator");
  const db = drizzle(process.env.DATABASE_URL, { schema });
  await migrate(db, { migrationsFolder: MIGRATIONS });
  return { db, close: () => db.$client.end() };
}

// Детерминированный генератор случайных чисел — данные одинаковы при каждом запуске
function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = rng(20261111);
const pick = <T,>(arr: T[]) => arr[Math.floor(rand() * arr.length)];
const at = (date: string, time = "10:00") => new Date(`${date}T${time}:00+03:00`);

const SEMESTER_START = "2026-09-01";
const SEMESTER_END = "2026-12-26";
const HOLIDAYS = new Set(["2026-11-04"]);

const DEMO_PASSWORDS = {
  maria: "maria2026",
  daniil: "daniil2026",
  artem: "artem2026",
  staff: "dekanat2026",
};

async function main() {
  const { db, close } = await connect();
  const today = todayMsk();
  console.log(`Заполняю БД вымышленными данными (сегодня ${today})…`);

  await db.execute(
    sql`TRUNCATE users, groups, teachers, subjects, request_counter, elective_rounds RESTART IDENTITY CASCADE`,
  );

  // ---------- Справочники ----------
  const [ivt, ek] = await db
    .insert(schema.groups)
    .values([
      {
        name: "ИВТ-31",
        faculty: "Факультет информационных технологий",
        program: "Информатика и вычислительная техника",
        programCode: "09.03.01",
        course: 3,
      },
      {
        name: "ЭК-11",
        faculty: "Экономический факультет",
        program: "Экономика",
        programCode: "38.03.01",
        course: 1,
      },
    ])
    .returning();

  const teacherRows = await db
    .insert(schema.teachers)
    .values([
      { fullName: "Миронов Павел Олегович", position: "профессор" },
      { fullName: "Белов Сергей Андреевич", position: "доцент" },
      { fullName: "Захарова Ирина Владимировна", position: "доцент" },
      { fullName: "Фёдоров Алексей Николаевич", position: "ассистент" },
      { fullName: "Громова Наталья Сергеевна", position: "доцент" },
      { fullName: "Ткаченко Виктор Ильич", position: "старший преподаватель" },
      { fullName: "Лисина Анна Петровна", position: "старший преподаватель" },
      { fullName: "Ковалёв Денис Романович", position: "преподаватель" },
      { fullName: "Кравцова Елена Игоревна", position: "старший преподаватель" },
      { fullName: "Сазонова Марина Юрьевна", position: "доцент" },
      { fullName: "Полякова Дарья Алексеевна", position: "доцент" },
      { fullName: "Егоров Игорь Валентинович", position: "профессор" },
      { fullName: "Морозова Светлана Борисовна", position: "старший преподаватель" },
    ])
    .returning();
  const T = (surname: string) => teacherRows.find((t) => t.fullName.startsWith(surname))!.id;

  const subjectCache = new Map<string, string>();
  async function S(name: string) {
    if (!subjectCache.has(name)) {
      const [row] = await db.insert(schema.subjects).values({ name }).returning();
      subjectCache.set(name, row.id);
    }
    return subjectCache.get(name)!;
  }

  // ---------- Пользователи ----------
  const [maria, daniil, artem, staff] = await db
    .insert(schema.users)
    .values([
      {
        login: "maria",
        passwordHash: await hashPassword(DEMO_PASSWORDS.maria),
        role: "student",
        lastName: "Лебедева",
        firstName: "Мария",
        middleName: "Андреевна",
        email: "maria@student.example",
      },
      {
        login: "daniil",
        passwordHash: await hashPassword(DEMO_PASSWORDS.daniil),
        role: "student",
        lastName: "Орлов",
        firstName: "Даниил",
        middleName: "Сергеевич",
        email: "daniil@student.example",
      },
      {
        login: "artem",
        passwordHash: await hashPassword(DEMO_PASSWORDS.artem),
        role: "student",
        lastName: "Соколов",
        firstName: "Артём",
        middleName: "Игоревич",
        email: "artem@student.example",
      },
      {
        login: "dekanat",
        passwordHash: await hashPassword(DEMO_PASSWORDS.staff),
        role: "staff",
        lastName: "Петрова",
        firstName: "Ольга",
        middleName: "Викторовна",
        email: "dekanat@university.example",
      },
    ])
    .returning();

  await db.insert(schema.students).values([
    { userId: maria.id, groupId: ivt.id, recordBook: "24-ИВТ-0137", studyForm: "очная", funding: "бюджет", admissionYear: 2024 },
    { userId: daniil.id, groupId: ivt.id, recordBook: "24-ИВТ-0152", studyForm: "очная", funding: "бюджет", admissionYear: 2024 },
    { userId: artem.id, groupId: ek.id, recordBook: "26-ЭК-0418", studyForm: "очная", funding: "контракт", admissionYear: 2026 },
  ]);

  // Одногруппники: нужны, чтобы у элективов были реальные «занятые места» и чтобы было видно,
  // сколько человек получит уведомление. Войти под ними нельзя: у всех хеш случайного
  // пароля, который нигде не сохранён.
  const lockedHash = await hashPassword(randomBytes(32).toString("hex"));
  const FIRST_M = ["Иван", "Кирилл", "Матвей", "Егор", "Никита", "Тимофей", "Арсений", "Глеб", "Максим", "Роман", "Лев", "Фёдор"];
  const FIRST_F = ["Анна", "Полина", "Софья", "Ева", "Алиса", "Варвара", "Дарья", "Ксения", "Вера", "Ульяна", "Милана", "Таисия"];
  const LAST = ["Смирнов", "Кузнецов", "Попов", "Васильев", "Новиков", "Волков", "Зайцев", "Павлов", "Семёнов", "Голубев", "Виноградов", "Богданов", "Воробьёв", "Тихонов", "Комаров", "Киселёв", "Макаров", "Андреев", "Ковалёв", "Ильин", "Гусев", "Титов", "Кудрявцев", "Баранов"];
  async function classmates(groupId: string, prefix: string, n: number, year: number) {
    const ids: string[] = [];
    for (let i = 0; i < n; i++) {
      const female = rand() < 0.5;
      const last = LAST[(i * 7 + prefix.length) % LAST.length];
      const [u] = await db
        .insert(schema.users)
        .values({
          login: `${prefix.toLowerCase()}-${String(i + 1).padStart(2, "0")}`,
          passwordHash: lockedHash,
          role: "student",
          lastName: female ? `${last}а` : last,
          firstName: pick(female ? FIRST_F : FIRST_M),
          middleName: null,
        })
        .returning({ id: schema.users.id });
      await db.insert(schema.students).values({
        userId: u.id,
        groupId,
        recordBook: `${String(year).slice(2)}-${prefix}-${String(300 + i * 11).padStart(4, "0")}`,
        studyForm: "очная",
        funding: rand() < 0.75 ? "бюджет" : "контракт",
        admissionYear: year,
      });
      ids.push(u.id);
    }
    return ids;
  }
  const ivtMates = await classmates(ivt.id, "ИВТ", 22, 2024);
  const ekMates = await classmates(ek.id, "ЭК", 24, 2026);

  // ---------- Расписание ----------
  type Slot = { wd: number; pair: number; subject: string; type: "lecture" | "practice" | "lab" | "seminar"; room: string; teacher: string };
  const templates: Record<string, Slot[]> = {
    [ivt.id]: [
      { wd: 1, pair: 1, subject: "Базы данных", type: "lecture", room: "3-301", teacher: "Миронов" },
      { wd: 1, pair: 2, subject: "Базы данных", type: "lab", room: "2-115", teacher: "Кравцова" },
      { wd: 1, pair: 3, subject: "Компьютерные сети", type: "lecture", room: "3-210", teacher: "Белов" },
      { wd: 2, pair: 2, subject: "Операционные системы", type: "lecture", room: "3-210", teacher: "Захарова" },
      { wd: 2, pair: 3, subject: "Операционные системы", type: "lab", room: "2-118", teacher: "Фёдоров" },
      { wd: 2, pair: 4, subject: "Иностранный язык", type: "practice", room: "1-405", teacher: "Лисина" },
      { wd: 3, pair: 1, subject: "Машинное обучение", type: "lecture", room: "3-301", teacher: "Громова" },
      { wd: 3, pair: 2, subject: "Машинное обучение", type: "practice", room: "2-120", teacher: "Громова" },
      { wd: 3, pair: 4, subject: "Физическая культура", type: "practice", room: "Спортзал", teacher: "Ковалёв" },
      { wd: 4, pair: 2, subject: "Веб-программирование", type: "lecture", room: "3-210", teacher: "Ткаченко" },
      { wd: 4, pair: 3, subject: "Веб-программирование", type: "lab", room: "2-115", teacher: "Ткаченко" },
      { wd: 4, pair: 4, subject: "Компьютерные сети", type: "lab", room: "2-118", teacher: "Белов" },
      { wd: 5, pair: 1, subject: "Базы данных", type: "practice", room: "2-115", teacher: "Кравцова" },
      { wd: 5, pair: 2, subject: "Машинное обучение", type: "lab", room: "2-120", teacher: "Фёдоров" },
    ],
    [ek.id]: [
      { wd: 1, pair: 1, subject: "Математический анализ", type: "lecture", room: "5-210", teacher: "Полякова" },
      { wd: 1, pair: 2, subject: "Математический анализ", type: "practice", room: "5-305", teacher: "Полякова" },
      { wd: 1, pair: 3, subject: "История России", type: "lecture", room: "5-101", teacher: "Егоров" },
      { wd: 2, pair: 1, subject: "Микроэкономика", type: "lecture", room: "5-101", teacher: "Сазонова" },
      { wd: 2, pair: 2, subject: "Микроэкономика", type: "seminar", room: "5-207", teacher: "Сазонова" },
      { wd: 2, pair: 3, subject: "Иностранный язык", type: "practice", room: "1-402", teacher: "Лисина" },
      { wd: 3, pair: 2, subject: "Информатика", type: "lecture", room: "3-210", teacher: "Ткаченко" },
      { wd: 3, pair: 3, subject: "Информатика", type: "lab", room: "2-116", teacher: "Ткаченко" },
      { wd: 3, pair: 4, subject: "Физическая культура", type: "practice", room: "Спортзал", teacher: "Ковалёв" },
      { wd: 4, pair: 1, subject: "Математический анализ", type: "practice", room: "5-305", teacher: "Полякова" },
      { wd: 4, pair: 2, subject: "История России", type: "seminar", room: "5-207", teacher: "Егоров" },
      { wd: 4, pair: 3, subject: "Основы бухгалтерского учёта", type: "lecture", room: "5-101", teacher: "Морозова" },
      { wd: 5, pair: 2, subject: "Основы бухгалтерского учёта", type: "seminar", room: "5-207", teacher: "Морозова" },
      { wd: 5, pair: 3, subject: "Микроэкономика", type: "seminar", room: "5-207", teacher: "Сазонова" },
      { wd: 6, pair: 1, subject: "Иностранный язык", type: "practice", room: "1-402", teacher: "Лисина" },
    ],
  };

  type LessonRow = typeof schema.lessons.$inferInsert;
  const lessonRows: LessonRow[] = [];
  const notifRows: (typeof schema.notifications.$inferInsert)[] = [];
  const ROOMS = ["4-112", "4-215", "3-118", "2-204", "5-312"];
  const SUBSTITUTES = ["Фёдоров", "Кравцова", "Громова"];
  const short = (full: string) => full.replace(/^(\S+) (\S)\S* (\S)\S*$/, "$1 $2. $3.");

  for (const [groupId, slots] of Object.entries(templates)) {
    for (let week = startOfWeek(SEMESTER_START); week <= SEMESTER_END; week = addDays(week, 7)) {
      const weekLessons: LessonRow[] = [];
      for (const s of slots) {
        const date = addDays(week, s.wd - 1);
        if (date < SEMESTER_START || date > SEMESTER_END || HOLIDAYS.has(date)) continue;
        weekLessons.push({
          groupId,
          subjectId: await S(s.subject),
          teacherId: T(s.teacher),
          date,
          pair: s.pair,
          type: s.type,
          room: s.room,
        });
      }
      // Каждую неделю 2–3 изменения: так в любой день демонстрации есть что показать
      const candidates = weekLessons.filter((l) => l.room !== "Спортзал");
      const changed = new Set<LessonRow>();
      const take = () => {
        const free = candidates.filter((l) => !changed.has(l));
        const l = pick(free);
        changed.add(l);
        return l;
      };
      if (candidates.length >= 3) {
        const a = take();
        const kind = rand() < 0.6 ? "room_changed" : "replaced";
        if (kind === "room_changed") {
          const room = pick(ROOMS);
          a.changeNote = `Аудитория изменена: ${a.room} → ${room}`;
          a.room = room;
          a.status = "room_changed";
        } else {
          // Замена — на преподавателя, который не ведёт эту пару
          const sub = pick(SUBSTITUTES.filter((x) => T(x) !== a.teacherId));
          a.status = "replaced";
          a.teacherId = T(sub);
          a.changeNote = `Замена преподавателя: ${short(teacherRows.find((t) => t.id === T(sub))!.fullName)}`;
        }
        const b = take();
        if (rand() < 0.5) {
          b.status = "cancelled";
          b.changeNote = pick(["Преподаватель на конференции", "Пара отменена по болезни преподавателя", "Отменена: день открытых дверей"]);
        } else {
          // перенос на субботу/свободную пару той же недели
          const targetDate = addDays(week, 5); // суббота
          const busy = new Set(weekLessons.filter((l) => l.date === targetDate).map((l) => l.pair));
          const targetPair = [2, 3, 4].find((p) => !busy.has(p))!;
          if (targetDate <= SEMESTER_END) {
            b.status = "moved";
            b.movedToDate = targetDate;
            b.movedToPair = targetPair;
            b.changeNote = `Перенесена на ${weekdayShort(targetDate)}, ${targetPair} пару (${PAIRS[targetPair].start})`;
            weekLessons.push({
              ...b,
              date: targetDate,
              pair: targetPair,
              status: "normal",
              movedToDate: null,
              movedToPair: null,
              changeNote: `Перенос с ${weekdayShort(b.date!)}, ${b.pair} пары`,
            });
          }
        }
        // Уведомления об изменениях на ближайшие дни
        for (const l of [a, b]) {
          if (l.date! >= addDays(today, -3) && l.date! <= addDays(today, 10)) {
            notifRows.push({
              groupId,
              category: "schedule",
              title: l.status === "cancelled" ? "Пара отменена" : l.status === "moved" ? "Пара перенесена" : "Изменение в расписании",
              body: `${weekdayShort(l.date!)}, ${l.pair} пара: ${l.changeNote}`,
              important: l.status === "cancelled" || l.status === "moved" ? 1 : 0,
              link: `/schedule?date=${l.date}`,
              // за два дня до пары, но не позже «сейчас» — уведомлений из будущего не бывает
              createdAt: new Date(Math.min(at(addDays(l.date!, -2), "16:30").getTime(), Date.now() - 3 * 3600_000)),
            });
          }
        }
      }
      lessonRows.push(...weekLessons);
    }
  }
  for (let i = 0; i < lessonRows.length; i += 400) {
    await db.insert(schema.lessons).values(lessonRows.slice(i, i + 400));
  }
  console.log(`  занятий: ${lessonRows.length}`);

  // ---------- Успеваемость ----------
  type Ctrl = "exam" | "credit" | "graded_credit" | "coursework";
  const plans: Record<Ctrl, { title: string; max: number; due: string | "EXAM" }[]> = {
    exam: [
      { title: "Контрольная точка 1", max: 20, due: "2026-10-09" },
      { title: "Контрольная точка 2", max: 20, due: "2026-11-13" },
      { title: "Контрольная точка 3", max: 20, due: "2026-12-11" },
      { title: "Экзамен", max: 40, due: "EXAM" },
    ],
    credit: [
      { title: "Работы 1–4", max: 30, due: "2026-10-16" },
      { title: "Работы 5–8", max: 30, due: "2026-11-20" },
      { title: "Итоговое задание", max: 40, due: "2026-12-18" },
    ],
    graded_credit: [
      { title: "Лабораторные 1–4", max: 30, due: "2026-10-16" },
      { title: "Лабораторные 5–8", max: 30, due: "2026-11-06" },
      { title: "Итоговый проект", max: 40, due: "2026-12-18" },
    ],
    coursework: [
      { title: "Утверждение темы", max: 10, due: "2026-09-25" },
      { title: "Черновик работы", max: 30, due: "2026-11-06" },
      { title: "Защита", max: 60, due: "2026-12-15" },
    ],
  };

  type Course = { subject: string; control: Ctrl; credits: number; teacher: string; exam?: [string, string, string] };
  const ivtCourses: Course[] = [
    { subject: "Базы данных", control: "exam", credits: 5, teacher: "Миронов", exam: ["2027-01-12", "09:00", "3-301"] },
    { subject: "Компьютерные сети", control: "exam", credits: 4, teacher: "Белов", exam: ["2027-01-16", "09:00", "3-210"] },
    { subject: "Машинное обучение", control: "exam", credits: 5, teacher: "Громова", exam: ["2027-01-21", "10:00", "3-301"] },
    { subject: "Операционные системы", control: "graded_credit", credits: 4, teacher: "Захарова", exam: ["2026-12-23", "12:10", "2-118"] },
    { subject: "Веб-программирование", control: "credit", credits: 3, teacher: "Ткаченко", exam: ["2026-12-24", "10:10", "2-115"] },
    { subject: "Иностранный язык", control: "credit", credits: 2, teacher: "Лисина", exam: ["2026-12-22", "13:50", "1-405"] },
    { subject: "Курсовая работа по базам данных", control: "coursework", credits: 2, teacher: "Миронов", exam: ["2026-12-15", "15:30", "3-301"] },
  ];
  const ekCourses: Course[] = [
    { subject: "Математический анализ", control: "exam", credits: 6, teacher: "Полякова", exam: ["2027-01-13", "09:00", "5-210"] },
    { subject: "Микроэкономика", control: "exam", credits: 5, teacher: "Сазонова", exam: ["2027-01-17", "10:00", "5-101"] },
    { subject: "История России", control: "exam", credits: 4, teacher: "Егоров", exam: ["2027-01-22", "09:00", "5-101"] },
    { subject: "Информатика", control: "graded_credit", credits: 3, teacher: "Ткаченко", exam: ["2026-12-23", "10:10", "2-116"] },
    { subject: "Основы бухгалтерского учёта", control: "credit", credits: 3, teacher: "Морозова", exam: ["2026-12-24", "12:10", "5-207"] },
    { subject: "Иностранный язык", control: "credit", credits: 3, teacher: "Лисина", exam: ["2026-12-25", "08:30", "1-402"] },
  ];

  async function enroll(
    studentId: string,
    semester: number,
    courses: Course[],
    skill: (subject: string) => number,
    missing: (subject: string, title: string) => boolean = () => false,
  ) {
    for (const c of courses) {
      const [e] = await db
        .insert(schema.enrollments)
        .values({
          studentId,
          subjectId: await S(c.subject),
          teacherId: T(c.teacher),
          semester,
          controlType: c.control,
          credits: c.credits,
          examDate: c.exam?.[0],
          examTime: c.exam?.[1],
          examRoom: c.exam?.[2],
        })
        .returning();
      const k = skill(c.subject);
      await db.insert(schema.assessments).values(
        plans[c.control].map((p) => {
          const due = p.due === "EXAM" ? c.exam![0] : p.due;
          const graded = due < today && !missing(c.subject, p.title);
          const noise = (rand() - 0.5) * 0.2;
          return {
            enrollmentId: e.id,
            title: p.title,
            maxScore: p.max,
            dueDate: due,
            score: graded ? Math.max(0, Math.min(p.max, Math.round(p.max * (k + noise)))) : null,
          };
        }),
      );
    }
  }

  await enroll(maria.id, 5, ivtCourses, () => 0.92);
  await enroll(daniil.id, 5, ivtCourses, (s) => (s === "Компьютерные сети" ? 0.48 : s === "Машинное обучение" ? 0.62 : 0.74));
  await enroll(
    artem.id,
    1,
    ekCourses,
    (s) => (s === "Математический анализ" ? 0.42 : s === "История России" ? 0.88 : 0.78),
    (s, t) => s === "Математический анализ" && t === "Контрольная точка 1",
  );

  // Прошлые семестры (итоговые оценки)
  const history: Record<number, [string, Ctrl, number, string][]> = {
    1: [
      ["Алгебра и геометрия", "exam", 5, "Полякова"],
      ["Математический анализ", "exam", 6, "Полякова"],
      ["Программирование", "exam", 5, "Ткаченко"],
      ["История России", "exam", 4, "Егоров"],
      ["Иностранный язык", "credit", 3, "Лисина"],
      ["Физическая культура", "credit", 2, "Ковалёв"],
    ],
    2: [
      ["Дискретная математика", "exam", 5, "Миронов"],
      ["Алгоритмы и структуры данных", "exam", 5, "Кравцова"],
      ["Физика", "exam", 4, "Белов"],
      ["Философия", "graded_credit", 3, "Егоров"],
      ["Иностранный язык", "credit", 3, "Лисина"],
    ],
    3: [
      ["Теория вероятностей", "exam", 5, "Полякова"],
      ["Объектно-ориентированное программирование", "exam", 5, "Ткаченко"],
      ["Архитектура ЭВМ", "exam", 4, "Белов"],
      ["Экономика", "graded_credit", 3, "Сазонова"],
      ["Иностранный язык", "credit", 2, "Лисина"],
    ],
    4: [
      ["Математическая статистика", "exam", 5, "Громова"],
      ["Технологии программирования", "exam", 4, "Ткаченко"],
      ["Электротехника", "graded_credit", 3, "Белов"],
      ["Безопасность жизнедеятельности", "credit", 2, "Ковалёв"],
      ["Курсовая работа по ООП", "coursework", 2, "Ткаченко"],
    ],
  };
  const semesterEnd: Record<number, string> = { 1: "2025-01-24", 2: "2025-06-27", 3: "2026-01-23", 4: "2026-06-26" };
  for (const [student, marks] of [
    [maria.id, ["5", "5", "5", "4", "5", "5", "5", "5", "5", "5", "5", "4", "5", "5", "5", "5", "5", "5", "5", "5", "5", "5"]],
    [daniil.id, ["4", "3", "4", "4", "4", "4", "4", "3", "4", "4", "4", "3", "4", "4", "4", "4", "4", "4", "3", "4", "4", "4"]],
  ] as const) {
    let i = 0;
    for (const sem of [1, 2, 3, 4]) {
      for (const [subject, control, credits, teacher] of history[sem]) {
        const m = marks[i++ % marks.length];
        await db.insert(schema.enrollments).values({
          studentId: student,
          subjectId: await S(subject),
          teacherId: T(teacher),
          semester: sem,
          controlType: control,
          credits,
          finalMark: control === "credit" ? "зачтено" : m,
          finalDate: addDays(semesterEnd[sem], -Math.floor(rand() * 14)),
        });
      }
    }
  }

  // ---------- Заявки ----------
  let counter = 0;
  async function request(
    studentId: string,
    type: string,
    payload: Record<string, string>,
    events: [schema_status: (typeof schema.requestStatusEnum.enumValues)[number], date: string, comment?: string][],
  ) {
    const last = events[events.length - 1];
    counter++;
    const [r] = await db
      .insert(schema.requests)
      .values({
        number: `З-2026-${String(counter).padStart(5, "0")}`,
        studentId,
        type,
        payload,
        status: last[0],
        staffComment: last[2] ?? null,
        verifyCode: last[0] === "ready" || last[0] === "done" ? randomBytes(5).toString("hex").toUpperCase() : null,
        createdAt: at(events[0][1], "11:20"),
        updatedAt: at(last[1], "15:05"),
      })
      .returning();
    await db.insert(schema.requestEvents).values(
      events.map(([status, date, comment]) => ({
        requestId: r.id,
        status,
        comment: comment ?? null,
        actorId: status === "submitted" ? studentId : staff.id,
        createdAt: at(date, status === "submitted" ? "11:20" : "15:05"),
      })),
    );
    return r;
  }

  await request(maria.id, "study_certificate", { purpose: "В Социальный фонд", copies: "1", delivery: "Электронно, с кодом проверки" }, [
    ["submitted", "2026-09-15"],
    ["in_review", "2026-09-15"],
    ["ready", "2026-09-16"],
    ["done", "2026-09-17", "Справка выдана"],
  ]);
  const mariaReady = await request(maria.id, "transcript", { language: "Английский", delivery: "Электронно, с кодом проверки" }, [
    ["submitted", addDays(today, -6)],
    ["in_review", addDays(today, -5)],
    ["ready", addDays(today, -1), "Выписка готова, её можно скачать или забрать в 214 кабинете"],
  ]);
  const daniilReq = await request(daniil.id, "military_certificate", { copies: "2", delivery: "Бумажная, в деканате" }, [
    ["submitted", addDays(today, -2)],
    ["in_review", addDays(today, -1)],
  ]);
  const artemReq = await request(artem.id, "financial_aid", { reason: "Тяжёлое материальное положение", comment: "Прошу рассмотреть заявление." }, [
    ["submitted", addDays(today, -4)],
    ["needs_info", addDays(today, -2), "Приложите, пожалуйста, справку о составе семьи — её можно принести в 214 кабинет"],
  ]);
  await request(artem.id, "study_certificate", { purpose: "По месту требования", copies: "2", delivery: "Бумажная, в деканате" }, [
    ["submitted", today],
  ]);
  await db.insert(schema.requestCounter).values({ year: 2026, value: counter });

  // ---------- Элективы ----------
  // Срок записи всегда в будущем относительно дня заполнения базы: так запись открыта,
  // когда бы жюри ни зашло (пересоздайте данные в день отправки — см. docs/deploy.md).
  const electivesClose = addDays(today, 8) > "2026-11-20" ? addDays(today, 8) : "2026-11-20";
  const [ivtRound, ekRound] = await db
    .insert(schema.electiveRounds)
    .values([
      { course: 3, semester: 6, title: "Дисциплины по выбору, 6 семестр", pick: 2, closesAt: at(electivesClose, "23:59") },
      { course: 1, semester: 2, title: "Дисциплины по выбору, 2 семестр", pick: 2, closesAt: at(electivesClose, "23:59") },
    ])
    .returning();

  type El = { title: string; description: string; teacher: string; capacity: number; slot: string; format: string; taken: number };
  const ivtElectives: El[] = [
    { title: "Разработка игр на Unity", description: "Игровой цикл, физика, анимация и сборка под мобильные платформы. Итог — своя игра в команде из 2–3 человек.", teacher: "Фёдоров", capacity: 12, slot: "Пн, 5 пара", format: "очно", taken: 12 },
    { title: "Основы кибербезопасности", description: "Типовые уязвимости веб-приложений, криптография на практике, разбор задач CTF.", teacher: "Белов", capacity: 15, slot: "Вт, 5 пара", format: "очно", taken: 13 },
    { title: "Анализ данных на Python", description: "pandas, визуализация, A/B-тесты. Работаем с открытыми наборами данных.", teacher: "Громова", capacity: 25, slot: "Ср, 5 пара", format: "смешанный", taken: 9 },
    { title: "Мобильная разработка", description: "Kotlin и Jetpack Compose: от макета до публикации приложения в магазине.", teacher: "Ткаченко", capacity: 20, slot: "Чт, 5 пара", format: "очно", taken: 6 },
    { title: "Управление IT-проектами", description: "Scrum и Kanban, оценка задач, работа с заказчиком. Много командных кейсов.", teacher: "Сазонова", capacity: 30, slot: "Пт, 4 пара", format: "онлайн", taken: 3 },
  ];
  const ekElectives: El[] = [
    { title: "Финансовая грамотность", description: "Личный бюджет, кредиты, вклады и налоговые вычеты на реальных примерах.", teacher: "Морозова", capacity: 30, slot: "Вт, 4 пара", format: "очно", taken: 17 },
    { title: "Деловой английский", description: "Переписка, презентации и переговоры на английском. Нужен уровень B1.", teacher: "Лисина", capacity: 14, slot: "Чт, 4 пара", format: "очно", taken: 14 },
    { title: "Excel для экономистов", description: "Сводные таблицы, Power Query, финансовые функции и дашборды.", teacher: "Ткаченко", capacity: 20, slot: "Пт, 4 пара", format: "смешанный", taken: 11 },
    { title: "Поведенческая экономика", description: "Почему люди принимают «нерациональные» решения и как это используют компании.", teacher: "Сазонова", capacity: 25, slot: "Ср, 5 пара", format: "онлайн", taken: 4 },
  ];
  async function seedElectives(roundId: string, list: El[], mates: string[], demoPicks: [string, number[]][]) {
    const rows = await db
      .insert(schema.electives)
      .values(list.map((e) => ({ title: e.title, description: e.description, capacity: e.capacity, slot: e.slot, format: e.format, roundId, teacherId: T(e.teacher) })))
      .returning();
    const picks = new Map(mates.map((m) => [m, 0]));
    const choices: (typeof schema.electiveChoices.$inferInsert)[] = [];
    for (const [userId, idx] of demoPicks) for (const i of idx) choices.push({ studentId: userId, electiveId: rows[i].id, createdAt: at(addDays(today, -2), "21:10") });
    list.forEach((e, i) => {
      const already = choices.filter((c) => c.electiveId === rows[i].id).length;
      // Места занимают те одногруппники, кто выбрал меньше всего
      const order = [...picks.entries()].filter(([, n]) => n < 2).sort((a, b) => a[1] - b[1]);
      for (const [m] of order.slice(0, Math.max(0, e.taken - already))) {
        choices.push({ studentId: m, electiveId: rows[i].id, createdAt: at(addDays(today, -Math.floor(rand() * 6) - 1), "19:00") });
        picks.set(m, picks.get(m)! + 1);
      }
    });
    if (choices.length) await db.insert(schema.electiveChoices).values(choices);
  }
  // Даниил уже выбрал (видно состояние «готово»), Мария и Артём — ещё нет
  await seedElectives(ivtRound.id, ivtElectives, ivtMates, [[daniil.id, [1, 2]]]);
  await seedElectives(ekRound.id, ekElectives, ekMates, []);

  const MONTHS_GEN = ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"];

  // ---------- Уведомления ----------
  notifRows.push(
    {
      category: "deadline",
      title: "Запись на элективы весеннего семестра",
      body: `Выберите две дисциплины по выбору в разделе «Учёба». Запись открыта до ${Number(electivesClose.slice(8))} ${MONTHS_GEN[Number(electivesClose.slice(5, 7)) - 1]}, места ограничены.`,
      important: 1,
      dueAt: at(electivesClose, "23:59"),
      link: "/grades/electives",
      createdAt: at("2026-11-05", "12:00"),
    },
    {
      category: "deadline",
      title: "Медосмотр для студентов 1–3 курсов",
      body: "Пройдите медосмотр в студенческой поликлинике (корпус 7) с 9:00 до 15:00. Возьмите с собой студенческий билет.",
      dueAt: at("2026-11-30", "15:00"),
      createdAt: at("2026-11-02", "09:30"),
    },
    {
      category: "news",
      title: "Зимняя школа по анализу данных",
      body: "Открыт приём заявок на зимнюю школу (25–30 января). Участие бесплатное, лучшим — стажировка.",
      createdAt: at("2026-11-09", "14:00"),
    },
    {
      category: "news",
      title: "Библиотека работает до 22:00",
      body: "На время подготовки к сессии читальный зал главного корпуса открыт до 22:00, включая субботу.",
      createdAt: at("2026-10-28", "10:00"),
    },
    {
      category: "news",
      title: "4 ноября — выходной день",
      body: "В День народного единства занятий нет. Пары с 4 ноября не переносятся.",
      createdAt: at("2026-10-30", "10:00"),
    },
    {
      groupId: ivt.id,
      category: "deadline",
      title: "Защита курсовой по базам данных",
      body: "Защита — 15 декабря в 3-301. За неделю до защиты загрузите итоговый текст работы научному руководителю.",
      important: 1,
      dueAt: at("2026-12-15", "15:30"),
      createdAt: at("2026-11-06", "18:00"),
    },
    {
      groupId: ivt.id,
      category: "grades",
      title: "Выставлены баллы за КТ1",
      body: "Преподаватели выставили баллы за первую контрольную точку по всем дисциплинам.",
      link: "/grades",
      createdAt: at("2026-10-12", "17:00"),
    },
    {
      groupId: ek.id,
      category: "deadline",
      title: "Пересдача КТ1 по математическому анализу",
      body: "Пересдача первой контрольной точки — в четверг на практике. Без неё не будет допуска к экзамену.",
      important: 1,
      dueAt: at("2026-11-19", "08:30"),
      createdAt: at("2026-11-10", "10:00"),
    },
    {
      groupId: ek.id,
      category: "news",
      title: "Встреча первокурсников с куратором",
      body: "В пятницу после 3 пары в 5-101: расскажем про сессию, стипендию и студенческие объединения.",
      createdAt: at("2026-11-06", "11:00"),
    },
    {
      userId: artem.id,
      category: "deadline",
      title: "Оплата обучения за весенний семестр",
      body: "Оплатите обучение до 25 декабря, чтобы не было задолженности перед сессией. Реквизиты — в профиле договора.",
      important: 1,
      dueAt: at("2026-12-25", "23:59"),
      createdAt: at("2026-11-01", "10:00"),
    },
    {
      userId: artem.id,
      category: "request",
      title: `Заявка ${artemReq.number}: нужно уточнение`,
      body: "Приложите, пожалуйста, справку о составе семьи — её можно принести в 214 кабинет.",
      link: `/requests/${artemReq.id}`,
      createdAt: at(addDays(today, -2), "15:05"),
    },
    {
      userId: maria.id,
      category: "request",
      title: `Заявка ${mariaReady.number}: готова`,
      body: "Выписка оценок готова. Её можно скачать или забрать в 214 кабинете.",
      link: `/requests/${mariaReady.id}`,
      createdAt: at(addDays(today, -1), "15:05"),
    },
    {
      userId: daniil.id,
      category: "request",
      title: `Заявка ${daniilReq.number}: в работе`,
      body: "Сотрудник деканата начал готовить справку в военкомат.",
      link: `/requests/${daniilReq.id}`,
      createdAt: at(addDays(today, -1), "15:05"),
    },
  );
  const notifs = await db.insert(schema.notifications).values(notifRows).returning();

  // Старые уведомления помечаем прочитанными
  const old = notifs.filter((n) => n.createdAt < at(addDays(today, -7)));
  const reads = old.flatMap((n) =>
    [maria.id, daniil.id, artem.id].map((userId) => ({ notificationId: n.id, userId, readAt: n.createdAt })),
  );
  if (reads.length) await db.insert(schema.notificationReads).values(reads);

  console.log(`  уведомлений: ${notifs.length}, заявок: ${counter}`);
  console.log("\nДемо-аккаунты (логин / пароль):");
  console.log(`  студентка ИВТ-31: maria / ${DEMO_PASSWORDS.maria}`);
  console.log(`  студент ИВТ-31:   daniil / ${DEMO_PASSWORDS.daniil}`);
  console.log(`  студент ЭК-11:    artem / ${DEMO_PASSWORDS.artem}`);
  console.log(`  деканат:          dekanat / ${DEMO_PASSWORDS.staff}`);
  console.log(`  (сегодня по Москве: ${today}, ${weekday(today)}-й день недели)`);
  await close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
