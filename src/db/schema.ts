import {
  pgTable,
  pgEnum,
  uuid,
  text,
  integer,
  timestamp,
  date,
  jsonb,
  primaryKey,
  index,
} from "drizzle-orm/pg-core";

const createdAt = () =>
  timestamp("created_at", { withTimezone: true }).notNull().defaultNow();

export const roleEnum = pgEnum("role", ["student", "staff"]);

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  login: text("login").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: roleEnum("role").notNull(),
  lastName: text("last_name").notNull(),
  firstName: text("first_name").notNull(),
  middleName: text("middle_name"),
  email: text("email"),
  createdAt: createdAt(),
});

export const sessions = pgTable(
  "sessions",
  {
    // SHA-256 от токена из cookie. Сам токен в БД не хранится.
    id: text("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("sessions_user_idx").on(t.userId)],
);

export const groups = pgTable("groups", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(),
  faculty: text("faculty").notNull(),
  program: text("program").notNull(),
  programCode: text("program_code").notNull(),
  course: integer("course").notNull(),
});

export const students = pgTable(
  "students",
  {
    userId: uuid("user_id")
      .primaryKey()
      .references(() => users.id, { onDelete: "cascade" }),
    groupId: uuid("group_id")
      .notNull()
      .references(() => groups.id),
    recordBook: text("record_book").notNull(),
    studyForm: text("study_form").notNull(), // очная / заочная
    funding: text("funding").notNull(), // бюджет / контракт
    admissionYear: integer("admission_year").notNull(),
  },
  (t) => [index("students_group_idx").on(t.groupId)],
);

export const teachers = pgTable("teachers", {
  id: uuid("id").primaryKey().defaultRandom(),
  fullName: text("full_name").notNull(),
  position: text("position").notNull(),
  email: text("email"),
});

export const subjects = pgTable("subjects", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
});

export const lessonTypeEnum = pgEnum("lesson_type", ["lecture", "practice", "lab", "seminar"]);
export const lessonStatusEnum = pgEnum("lesson_status", [
  "normal",
  "moved", // перенесено на другое время/дату
  "cancelled",
  "room_changed",
  "replaced", // замена преподавателя
]);

export const lessons = pgTable(
  "lessons",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    groupId: uuid("group_id")
      .notNull()
      .references(() => groups.id),
    subjectId: uuid("subject_id")
      .notNull()
      .references(() => subjects.id),
    teacherId: uuid("teacher_id")
      .notNull()
      .references(() => teachers.id),
    date: date("date", { mode: "string" }).notNull(), // YYYY-MM-DD, Москва
    pair: integer("pair").notNull(), // номер пары 1..7
    type: lessonTypeEnum("type").notNull(),
    room: text("room").notNull(),
    status: lessonStatusEnum("status").notNull().default("normal"),
    changeNote: text("change_note"),
    // для status = moved: куда перенесли
    movedToDate: date("moved_to_date", { mode: "string" }),
    movedToPair: integer("moved_to_pair"),
  },
  (t) => [index("lessons_group_date_idx").on(t.groupId, t.date)],
);

export const controlTypeEnum = pgEnum("control_type", [
  "exam",
  "credit", // зачёт
  "graded_credit", // дифференцированный зачёт
  "coursework",
]);

export const enrollments = pgTable(
  "enrollments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    studentId: uuid("student_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    subjectId: uuid("subject_id")
      .notNull()
      .references(() => subjects.id),
    teacherId: uuid("teacher_id")
      .notNull()
      .references(() => teachers.id),
    semester: integer("semester").notNull(),
    controlType: controlTypeEnum("control_type").notNull(),
    credits: integer("credits").notNull(), // ЗЕТ
    // итог: "5" | "4" | "3" | "2" | "зачтено" | "не зачтено" | null (ещё не сдано)
    finalMark: text("final_mark"),
    finalDate: date("final_date", { mode: "string" }),
    // сессия
    examDate: date("exam_date", { mode: "string" }),
    examTime: text("exam_time"),
    examRoom: text("exam_room"),
  },
  (t) => [index("enrollments_student_idx").on(t.studentId, t.semester)],
);

export const assessments = pgTable(
  "assessments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    enrollmentId: uuid("enrollment_id")
      .notNull()
      .references(() => enrollments.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    maxScore: integer("max_score").notNull(),
    score: integer("score"), // null — ещё не оценено
    dueDate: date("due_date", { mode: "string" }),
  },
  (t) => [index("assessments_enrollment_idx").on(t.enrollmentId)],
);

export const requestStatusEnum = pgEnum("request_status", [
  "submitted", // подана
  "in_review", // в работе
  "needs_info", // нужно уточнение
  "ready", // готова (можно забрать / скачать)
  "done", // выдана / закрыта
  "rejected",
]);

export const requests = pgTable(
  "requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    number: text("number").notNull().unique(),
    studentId: uuid("student_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(), // ключ из каталога src/lib/request-types.ts
    payload: jsonb("payload").$type<Record<string, string>>().notNull().default({}),
    status: requestStatusEnum("status").notNull().default("submitted"),
    staffComment: text("staff_comment"),
    verifyCode: text("verify_code"), // код проверки подлинности готовой справки
    createdAt: createdAt(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("requests_student_idx").on(t.studentId, t.createdAt),
    index("requests_status_idx").on(t.status),
  ],
);

export const requestEvents = pgTable(
  "request_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    requestId: uuid("request_id")
      .notNull()
      .references(() => requests.id, { onDelete: "cascade" }),
    status: requestStatusEnum("status").notNull(),
    comment: text("comment"),
    actorId: uuid("actor_id").references(() => users.id),
    createdAt: createdAt(),
  },
  (t) => [index("request_events_request_idx").on(t.requestId)],
);

export const notificationCategoryEnum = pgEnum("notification_category", [
  "news",
  "deadline",
  "schedule",
  "request",
  "grades",
]);

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // адресат: если оба null — всем студентам
    userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
    groupId: uuid("group_id").references(() => groups.id),
    category: notificationCategoryEnum("category").notNull(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    important: integer("important").notNull().default(0),
    dueAt: timestamp("due_at", { withTimezone: true }), // для дедлайнов
    link: text("link"),
    authorId: uuid("author_id").references(() => users.id),
    createdAt: createdAt(),
  },
  (t) => [
    index("notifications_user_idx").on(t.userId),
    index("notifications_group_idx").on(t.groupId),
    index("notifications_created_idx").on(t.createdAt),
  ],
);

export const notificationReads = pgTable(
  "notification_reads",
  {
    notificationId: uuid("notification_id")
      .notNull()
      .references(() => notifications.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    readAt: timestamp("read_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.notificationId, t.userId] })],
);

// ---------- Дисциплины по выбору (элективы) ----------

// Кампания записи: для какого курса, на какой семестр, сколько выбрать и до какого срока
export const electiveRounds = pgTable("elective_rounds", {
  id: uuid("id").primaryKey().defaultRandom(),
  course: integer("course").notNull(),
  semester: integer("semester").notNull(),
  title: text("title").notNull(),
  pick: integer("pick").notNull().default(2),
  closesAt: timestamp("closes_at", { withTimezone: true }).notNull(),
});

export const electives = pgTable(
  "electives",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    roundId: uuid("round_id")
      .notNull()
      .references(() => electiveRounds.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description").notNull(),
    teacherId: uuid("teacher_id")
      .notNull()
      .references(() => teachers.id),
    capacity: integer("capacity").notNull(),
    slot: text("slot").notNull(), // «Вт, 5 пара»
    format: text("format").notNull(), // очно / смешанный / онлайн
  },
  (t) => [index("electives_round_idx").on(t.roundId)],
);

export const electiveChoices = pgTable(
  "elective_choices",
  {
    studentId: uuid("student_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    electiveId: uuid("elective_id")
      .notNull()
      .references(() => electives.id, { onDelete: "cascade" }),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.studentId, t.electiveId] }), index("elective_choices_elective_idx").on(t.electiveId)],
);

// Счётчик для человекочитаемых номеров заявок (З-2026-00042)
export const requestCounter = pgTable("request_counter", {
  year: integer("year").primaryKey(),
  value: integer("value").notNull().default(0),
});
