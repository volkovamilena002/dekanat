import "server-only";
import { and, asc, desc, eq, gte, inArray, lte, sql } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db, schema } from "@/db";
import { requireStaff } from "@/lib/auth/session";
import { requestTypeByKey, STATUS_LABEL, type RequestStatus } from "@/lib/request-types";
import { daysBetween, formatDay, PAIRS, todayMsk, weekday, weekdayShort } from "@/lib/time";
import { newVerifyCode } from "./student";

// Data Access Layer сотрудника деканата. Каждая функция проверяет роль staff.

const { users, students, groups, requests, requestEvents, notifications } = schema;

export async function listAllRequests(statuses?: RequestStatus[]) {
  await requireStaff();
  return db
    .select({
      id: requests.id,
      number: requests.number,
      type: requests.type,
      status: requests.status,
      createdAt: requests.createdAt,
      updatedAt: requests.updatedAt,
      lastName: users.lastName,
      firstName: users.firstName,
      groupName: groups.name,
    })
    .from(requests)
    .innerJoin(users, eq(users.id, requests.studentId))
    .innerJoin(students, eq(students.userId, users.id))
    .innerJoin(groups, eq(groups.id, students.groupId))
    .where(statuses?.length ? inArray(requests.status, statuses) : undefined)
    .orderBy(asc(sql`case ${requests.status} when 'submitted' then 0 when 'in_review' then 1 when 'needs_info' then 2 when 'ready' then 3 else 4 end`), desc(requests.createdAt));
}

export async function requestCounts() {
  await requireStaff();
  const rows = await db
    .select({ status: requests.status, n: sql<number>`count(*)::int` })
    .from(requests)
    .groupBy(requests.status);
  return Object.fromEntries(rows.map((r) => [r.status, r.n])) as Partial<Record<RequestStatus, number>>;
}

export async function getRequestForStaff(id: string) {
  await requireStaff();
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const [req] = await db
    .select({
      request: requests,
      student: {
        lastName: users.lastName,
        firstName: users.firstName,
        middleName: users.middleName,
        recordBook: students.recordBook,
        funding: students.funding,
      },
      group: { name: groups.name, faculty: groups.faculty, course: groups.course },
    })
    .from(requests)
    .innerJoin(users, eq(users.id, requests.studentId))
    .innerJoin(students, eq(students.userId, users.id))
    .innerJoin(groups, eq(groups.id, students.groupId))
    .where(eq(requests.id, id));
  if (!req) notFound();
  const events = await db
    .select()
    .from(requestEvents)
    .where(eq(requestEvents.requestId, id))
    .orderBy(asc(requestEvents.createdAt));
  return { ...req, events };
}

// Допустимые переходы статусов
export const TRANSITIONS: Record<RequestStatus, RequestStatus[]> = {
  submitted: ["in_review", "needs_info", "rejected"],
  in_review: ["ready", "needs_info", "rejected"],
  needs_info: ["in_review", "rejected"],
  ready: ["done"],
  done: [],
  rejected: [],
};

export async function changeRequestStatus(id: string, status: RequestStatus, comment: string | null) {
  const staff = await requireStaff();
  const { request } = await getRequestForStaff(id);
  if (!TRANSITIONS[request.status].includes(status)) {
    return { ok: false as const, error: "Такой переход статуса недоступен" };
  }
  const type = requestTypeByKey(request.type);
  await db.transaction(async (tx) => {
    await tx
      .update(requests)
      .set({
        status,
        staffComment: comment,
        updatedAt: new Date(),
        verifyCode: status === "ready" && !request.verifyCode ? newVerifyCode() : request.verifyCode,
      })
      .where(eq(requests.id, id));
    await tx.insert(requestEvents).values({ requestId: id, status, comment, actorId: staff.id });
    // Студент сразу получает уведомление
    await tx.insert(notifications).values({
      userId: request.studentId,
      category: "request",
      title: `Заявка ${request.number}: ${STATUS_LABEL[status].toLowerCase()}`,
      body: comment || `${type?.title ?? "Заявка"} — статус изменён на «${STATUS_LABEL[status]}».`,
      important: status === "needs_info" || status === "ready" ? 1 : 0,
      link: `/requests/${id}`,
      authorId: staff.id,
    });
  });
  return { ok: true as const };
}

export async function listGroups() {
  await requireStaff();
  return db.select({ id: groups.id, name: groups.name }).from(groups).orderBy(asc(groups.name));
}

export async function publishNotification(input: {
  groupId: string | null;
  category: "news" | "deadline";
  title: string;
  body: string;
  important: boolean;
  dueAt: Date | null;
}) {
  const staff = await requireStaff();
  await db.insert(notifications).values({
    groupId: input.groupId,
    category: input.category,
    title: input.title,
    body: input.body,
    important: input.important ? 1 : 0,
    dueAt: input.dueAt,
    authorId: staff.id,
  });
}

export async function recentAnnouncements() {
  await requireStaff();
  return db
    .select({
      id: notifications.id,
      title: notifications.title,
      category: notifications.category,
      createdAt: notifications.createdAt,
      groupName: groups.name,
    })
    .from(notifications)
    .leftJoin(groups, eq(groups.id, notifications.groupId))
    .where(and(sql`${notifications.userId} is null`, inArray(notifications.category, ["news", "deadline"])))
    .orderBy(desc(notifications.createdAt))
    .limit(8);
}

// ---------- Расписание: переносы и отмены ----------

const { lessons, subjects, teachers } = schema;
const UUID_RE = /^[0-9a-f-]{36}$/i;
const HELD = sql`${lessons.status} not in ('cancelled', 'moved')`;

const lessonFields = {
  id: lessons.id,
  groupId: lessons.groupId,
  date: lessons.date,
  pair: lessons.pair,
  type: lessons.type,
  room: lessons.room,
  status: lessons.status,
  changeNote: lessons.changeNote,
  movedToDate: lessons.movedToDate,
  movedToPair: lessons.movedToPair,
  subjectId: lessons.subjectId,
  teacherId: lessons.teacherId,
  subject: subjects.name,
  teacher: teachers.fullName,
};

export async function listGroupsWithSize() {
  await requireStaff();
  return db
    .select({ id: groups.id, name: groups.name, course: groups.course, size: sql<number>`count(${students.userId})::int` })
    .from(groups)
    .leftJoin(students, eq(students.groupId, groups.id))
    .groupBy(groups.id)
    .orderBy(asc(groups.name));
}

export async function getGroupLessons(groupId: string, from: string, to: string) {
  await requireStaff();
  if (!UUID_RE.test(groupId)) notFound();
  return db
    .select(lessonFields)
    .from(lessons)
    .innerJoin(subjects, eq(subjects.id, lessons.subjectId))
    .innerJoin(teachers, eq(teachers.id, lessons.teacherId))
    .where(and(eq(lessons.groupId, groupId), gte(lessons.date, from), lte(lessons.date, to)))
    .orderBy(asc(lessons.date), asc(lessons.pair));
}

export async function getLessonForStaff(id: string) {
  await requireStaff();
  if (!UUID_RE.test(id)) notFound();
  const [row] = await db
    .select({ ...lessonFields, groupName: groups.name })
    .from(lessons)
    .innerJoin(subjects, eq(subjects.id, lessons.subjectId))
    .innerJoin(teachers, eq(teachers.id, lessons.teacherId))
    .innerJoin(groups, eq(groups.id, lessons.groupId))
    .where(eq(lessons.id, id));
  if (!row) notFound();
  return row;
}

export type StaffLesson = Awaited<ReturnType<typeof getLessonForStaff>>;

/** Можно ли менять пару: она ещё не прошла и не отменена/перенесена */
export function isEditable(l: { status: StaffLesson["status"]; date: string }, today = todayMsk()) {
  return l.status !== "cancelled" && l.status !== "moved" && l.date >= today;
}

export async function listTeachers() {
  await requireStaff();
  return db.select({ id: teachers.id, fullName: teachers.fullName }).from(teachers).orderBy(asc(teachers.fullName));
}

/** Аудитории, где в этот слот нет занятий (из тех, что встречаются в расписании) */
export async function freeRooms(date: string, pair: number) {
  await requireStaff();
  const [all, busy] = await Promise.all([
    db.selectDistinct({ room: lessons.room }).from(lessons),
    db
      .select({ room: lessons.room })
      .from(lessons)
      .where(and(eq(lessons.date, date), eq(lessons.pair, pair), HELD)),
  ]);
  const taken = new Set(busy.map((b) => b.room));
  return all
    .map((r) => r.room)
    .filter((r) => !taken.has(r) && r !== "Спортзал")
    .sort((a, b) => a.localeCompare(b, "ru"));
}

export type LessonChange =
  | { kind: "cancel"; reason: string }
  | { kind: "room"; room: string; reason: string | null }
  | { kind: "move"; date: string; pair: number; room: string | null; reason: string | null }
  | { kind: "replace"; teacherId: string; reason: string | null };

const shortName = (full: string) => {
  const [last, first, middle] = full.split(" ");
  return [last, first && `${first[0]}.`, middle && `${middle[0]}.`].filter(Boolean).join(" ");
};
const slotLabel = (date: string, pair: number) => `${weekdayShort(date)}, ${formatDay(date)}, ${pair} пара`;

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/** Проверка пересечений в слоте: группа, аудитория, преподаватель. Возвращает текст ошибки или null. */
async function conflict(
  tx: Tx,
  slot: { date: string; pair: number; excludeId: string; groupId?: string; room?: string; teacherId?: string },
) {
  const rows = await tx
    .select({ groupId: lessons.groupId, room: lessons.room, teacherId: lessons.teacherId, subject: subjects.name, groupName: groups.name })
    .from(lessons)
    .innerJoin(subjects, eq(subjects.id, lessons.subjectId))
    .innerJoin(groups, eq(groups.id, lessons.groupId))
    .where(and(eq(lessons.date, slot.date), eq(lessons.pair, slot.pair), HELD, sql`${lessons.id} <> ${slot.excludeId}`));
  const g = slot.groupId && rows.find((r) => r.groupId === slot.groupId);
  if (g) return `У группы в это время уже есть пара: ${g.subject}`;
  const r = slot.room && slot.room !== "Спортзал" && rows.find((x) => x.room === slot.room);
  if (r) return `Аудитория ${slot.room} в это время занята: ${r.groupName}, ${r.subject}`;
  const t = slot.teacherId && rows.find((x) => x.teacherId === slot.teacherId);
  if (t) return `Преподаватель в это время ведёт пару у группы ${t.groupName}`;
  return null;
}

type ChangeResult = { ok: true; notified: number; groupId: string; date: string } | { ok: false; error: string };

/**
 * Сотрудник меняет пару. Всё в одной транзакции: строка пары блокируется,
 * проверяются пересечения, группа получает уведомление.
 */
export async function changeLesson(id: string, change: LessonChange): Promise<ChangeResult> {
  const staff = await requireStaff();
  const today = todayMsk();
  if (!UUID_RE.test(id)) notFound();

  return db.transaction(async (tx): Promise<ChangeResult> => {
    const [l] = await tx.select().from(lessons).where(eq(lessons.id, id)).for("update");
    if (!l) notFound();
    if (!isEditable(l, today)) return { ok: false, error: "Эту пару уже нельзя изменить: она прошла, отменена или перенесена" };
    const [{ subject }] = await tx.select({ subject: subjects.name }).from(subjects).where(eq(subjects.id, l.subjectId));
    const where = `${slotLabel(l.date, l.pair)} — ${subject}`;
    const withReason = (s: string, reason: string | null) => (reason ? `${s}. ${reason}` : s);

    let title: string;
    let body: string;
    let important = 0;
    let showDate = l.date;

    switch (change.kind) {
      case "cancel": {
        await tx.update(lessons).set({ status: "cancelled", changeNote: change.reason }).where(eq(lessons.id, id));
        title = "Пара отменена";
        body = `${where}: пара отменена. ${change.reason}`;
        important = 1;
        break;
      }
      case "room": {
        if (change.room === l.room) return { ok: false, error: "Пара и так проходит в этой аудитории" };
        const c = await conflict(tx, { date: l.date, pair: l.pair, excludeId: id, room: change.room });
        if (c) return { ok: false, error: c };
        const note = withReason(`Аудитория изменена: ${l.room} → ${change.room}`, change.reason);
        await tx.update(lessons).set({ status: "room_changed", room: change.room, changeNote: note }).where(eq(lessons.id, id));
        title = "Новая аудитория";
        body = `${where}: аудитория ${l.room} → ${change.room}.${change.reason ? ` ${change.reason}` : ""}`;
        break;
      }
      case "replace": {
        if (change.teacherId === l.teacherId) return { ok: false, error: "Этот преподаватель и так ведёт пару" };
        const [t] = await tx.select().from(teachers).where(eq(teachers.id, change.teacherId));
        if (!t) return { ok: false, error: "Преподаватель не найден" };
        const c = await conflict(tx, { date: l.date, pair: l.pair, excludeId: id, teacherId: t.id });
        if (c) return { ok: false, error: c };
        const note = withReason(`Замена преподавателя: ${shortName(t.fullName)}`, change.reason);
        await tx.update(lessons).set({ status: "replaced", teacherId: t.id, changeNote: note }).where(eq(lessons.id, id));
        title = "Замена преподавателя";
        body = `${where}: пару проведёт ${t.fullName}.${change.reason ? ` ${change.reason}` : ""}`;
        break;
      }
      case "move": {
        if (change.date < today) return { ok: false, error: "Нельзя перенести пару в прошлое" };
        if (weekday(change.date) === 7) return { ok: false, error: "В воскресенье занятий нет" };
        if (daysBetween(today, change.date) > 60) return { ok: false, error: "Переносить можно не дальше чем на 60 дней вперёд" };
        if (change.date === l.date && change.pair === l.pair) return { ok: false, error: "Выберите другое время" };
        const room = change.room ?? l.room;
        const c = await conflict(tx, { date: change.date, pair: change.pair, excludeId: id, groupId: l.groupId, room, teacherId: l.teacherId });
        if (c) return { ok: false, error: c };
        const target = `${weekdayShort(change.date)}, ${formatDay(change.date)}, ${change.pair} пару (${PAIRS[change.pair].start})`;
        await tx
          .update(lessons)
          .set({ status: "moved", movedToDate: change.date, movedToPair: change.pair, changeNote: withReason(`Перенесена на ${target}`, change.reason) })
          .where(eq(lessons.id, id));
        await tx.insert(lessons).values({
          groupId: l.groupId,
          subjectId: l.subjectId,
          teacherId: l.teacherId,
          type: l.type,
          date: change.date,
          pair: change.pair,
          room,
          status: "normal",
          changeNote: `Перенос с ${weekdayShort(l.date)}, ${formatDay(l.date)}, ${l.pair} пары`,
        });
        title = "Пара перенесена";
        body = `${where}: перенесена на ${target}, ауд. ${room}.${change.reason ? ` ${change.reason}` : ""}`;
        important = 1;
        showDate = change.date;
        break;
      }
    }

    await tx.insert(notifications).values({
      groupId: l.groupId,
      category: "schedule",
      title,
      body,
      important,
      link: `/schedule?date=${showDate}`,
      authorId: staff.id,
    });
    const [{ n }] = await tx
      .select({ n: sql<number>`count(*)::int` })
      .from(students)
      .where(eq(students.groupId, l.groupId));
    return { ok: true, notified: n, groupId: l.groupId, date: showDate };
  });
}
