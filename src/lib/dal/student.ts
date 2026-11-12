import "server-only";
import { and, asc, desc, eq, gte, inArray, isNull, lte, or, sql } from "drizzle-orm";
import { notFound } from "next/navigation";
import { randomBytes } from "node:crypto";
import { db, schema } from "@/db";
import { requireStudent } from "@/lib/auth/session";
import type { RequestStatus } from "@/lib/request-types";

// Data Access Layer студента. Ни одна функция не принимает id студента снаружи:
// владелец всегда берётся из сессии (requireStudent) и добавляется в условие запроса.

const { users, students, groups, lessons, subjects, teachers, enrollments, assessments, requests, requestEvents, notifications, notificationReads } =
  schema;

export async function getProfile() {
  const me = await requireStudent();
  const [row] = await db
    .select({
      id: users.id,
      login: users.login,
      lastName: users.lastName,
      firstName: users.firstName,
      middleName: users.middleName,
      email: users.email,
      recordBook: students.recordBook,
      studyForm: students.studyForm,
      funding: students.funding,
      admissionYear: students.admissionYear,
      groupId: groups.id,
      groupName: groups.name,
      faculty: groups.faculty,
      program: groups.program,
      programCode: groups.programCode,
      course: groups.course,
    })
    .from(users)
    .innerJoin(students, eq(students.userId, users.id))
    .innerJoin(groups, eq(groups.id, students.groupId))
    .where(eq(users.id, me.id));
  if (!row) notFound();
  return row;
}

export type Profile = Awaited<ReturnType<typeof getProfile>>;

// ---------- Расписание ----------

export async function getLessons(from: string, to: string) {
  const { groupId } = await getProfile();
  return db
    .select({
      id: lessons.id,
      date: lessons.date,
      pair: lessons.pair,
      type: lessons.type,
      room: lessons.room,
      status: lessons.status,
      changeNote: lessons.changeNote,
      movedToDate: lessons.movedToDate,
      movedToPair: lessons.movedToPair,
      subject: subjects.name,
      teacher: teachers.fullName,
    })
    .from(lessons)
    .innerJoin(subjects, eq(subjects.id, lessons.subjectId))
    .innerJoin(teachers, eq(teachers.id, lessons.teacherId))
    .where(and(eq(lessons.groupId, groupId), gte(lessons.date, from), lte(lessons.date, to)))
    .orderBy(asc(lessons.date), asc(lessons.pair));
}

export type Lesson = Awaited<ReturnType<typeof getLessons>>[number];

// ---------- Успеваемость ----------

export async function getGrades() {
  const me = await requireStudent();
  const rows = await db
    .select({
      id: enrollments.id,
      semester: enrollments.semester,
      controlType: enrollments.controlType,
      credits: enrollments.credits,
      finalMark: enrollments.finalMark,
      finalDate: enrollments.finalDate,
      examDate: enrollments.examDate,
      examTime: enrollments.examTime,
      examRoom: enrollments.examRoom,
      subject: subjects.name,
      teacher: teachers.fullName,
    })
    .from(enrollments)
    .innerJoin(subjects, eq(subjects.id, enrollments.subjectId))
    .innerJoin(teachers, eq(teachers.id, enrollments.teacherId))
    .where(eq(enrollments.studentId, me.id))
    .orderBy(desc(enrollments.semester), asc(subjects.name));

  const ids = rows.map((r) => r.id);
  const items = ids.length
    ? await db
        .select()
        .from(assessments)
        .where(inArray(assessments.enrollmentId, ids))
        .orderBy(asc(assessments.dueDate))
    : [];

  const currentSemester = rows.reduce((m, r) => Math.max(m, r.semester), 0);
  return {
    currentSemester,
    courses: rows.map((r) => ({ ...r, items: items.filter((i) => i.enrollmentId === r.id) })),
  };
}

export type Course = Awaited<ReturnType<typeof getGrades>>["courses"][number];

// ---------- Заявки ----------

export async function listRequests() {
  const me = await requireStudent();
  return db
    .select()
    .from(requests)
    .where(eq(requests.studentId, me.id))
    .orderBy(desc(requests.createdAt));
}

/** Заявка текущего студента. Чужая или несуществующая → 404. */
export async function getRequest(id: string) {
  const me = await requireStudent();
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const [req] = await db
    .select()
    .from(requests)
    .where(and(eq(requests.id, id), eq(requests.studentId, me.id)));
  if (!req) notFound();
  const events = await db
    .select()
    .from(requestEvents)
    .where(eq(requestEvents.requestId, req.id))
    .orderBy(asc(requestEvents.createdAt));
  return { ...req, events };
}

export async function nextRequestNumber(tx: Pick<typeof db, "insert">) {
  const year = new Date().getFullYear();
  const [row] = await tx
    .insert(schema.requestCounter)
    .values({ year, value: 1 })
    .onConflictDoUpdate({ target: schema.requestCounter.year, set: { value: sql`${schema.requestCounter.value} + 1` } })
    .returning();
  return `З-${year}-${String(row.value).padStart(5, "0")}`;
}

export async function createRequest(type: string, payload: Record<string, string>) {
  const me = await requireStudent();
  return db.transaction(async (tx) => {
    const number = await nextRequestNumber(tx);
    const [req] = await tx
      .insert(requests)
      .values({ number, studentId: me.id, type, payload, status: "submitted" })
      .returning();
    await tx.insert(requestEvents).values({ requestId: req.id, status: "submitted", actorId: me.id });
    return req;
  });
}

/** Студент отменяет свою заявку, пока её не взяли в работу */
export async function cancelRequest(id: string) {
  const req = await getRequest(id);
  if (req.status !== "submitted" && req.status !== "needs_info") return false;
  const me = await requireStudent();
  await db.transaction(async (tx) => {
    await tx
      .update(requests)
      .set({ status: "rejected", staffComment: "Отменена студентом", updatedAt: new Date() })
      .where(and(eq(requests.id, req.id), eq(requests.studentId, me.id)));
    await tx.insert(requestEvents).values({ requestId: req.id, status: "rejected", comment: "Отменена студентом", actorId: me.id });
  });
  return true;
}

/** Ответ студента на «нужно уточнение» */
export async function answerRequest(id: string, comment: string) {
  const req = await getRequest(id);
  if (req.status !== "needs_info") return false;
  const me = await requireStudent();
  await db.transaction(async (tx) => {
    await tx
      .update(requests)
      .set({ status: "submitted", updatedAt: new Date() })
      .where(and(eq(requests.id, req.id), eq(requests.studentId, me.id)));
    await tx.insert(requestEvents).values({ requestId: req.id, status: "submitted", comment, actorId: me.id });
  });
  return true;
}

export const ACTIVE_STATUSES: RequestStatus[] = ["submitted", "in_review", "needs_info", "ready"];

// ---------- Уведомления ----------

async function audienceFilter() {
  const p = await getProfile();
  return {
    me: p,
    where: or(
      eq(notifications.userId, p.id),
      eq(notifications.groupId, p.groupId),
      and(isNull(notifications.userId), isNull(notifications.groupId)),
    )!,
  };
}

export async function listNotifications() {
  const { me, where } = await audienceFilter();
  return db
    .select({
      id: notifications.id,
      category: notifications.category,
      title: notifications.title,
      body: notifications.body,
      important: notifications.important,
      dueAt: notifications.dueAt,
      link: notifications.link,
      createdAt: notifications.createdAt,
      readAt: notificationReads.readAt,
    })
    .from(notifications)
    .leftJoin(
      notificationReads,
      and(eq(notificationReads.notificationId, notifications.id), eq(notificationReads.userId, me.id)),
    )
    .where(where)
    .orderBy(desc(notifications.createdAt));
}

export type Notification = Awaited<ReturnType<typeof listNotifications>>[number];

export async function unreadCount() {
  const list = await listNotifications();
  return list.filter((n) => !n.readAt).length;
}

export async function markNotificationsRead(ids?: string[]) {
  const { me } = await audienceFilter();
  const list = await listNotifications();
  const targets = list.filter((n) => !n.readAt && (!ids || ids.includes(n.id)));
  if (!targets.length) return;
  await db
    .insert(notificationReads)
    .values(targets.map((n) => ({ notificationId: n.id, userId: me.id })))
    .onConflictDoNothing();
}

export function newVerifyCode() {
  return randomBytes(5).toString("hex").toUpperCase();
}

// ---------- Элективы ----------

const { electiveRounds, electives, electiveChoices } = schema;

/** Текущая кампания записи на элективы для курса студента + места и мой выбор */
export async function getElectives() {
  const me = await getProfile();
  const [round] = await db
    .select()
    .from(electiveRounds)
    .where(eq(electiveRounds.course, me.course))
    .orderBy(desc(electiveRounds.closesAt))
    .limit(1);
  if (!round) return null;

  const taken = db
    .select({ electiveId: electiveChoices.electiveId, n: sql<number>`count(*)::int`.as("n") })
    .from(electiveChoices)
    .groupBy(electiveChoices.electiveId)
    .as("taken");
  const list = await db
    .select({
      id: electives.id,
      title: electives.title,
      description: electives.description,
      capacity: electives.capacity,
      slot: electives.slot,
      format: electives.format,
      teacher: teachers.fullName,
      taken: sql<number>`coalesce(${taken.n}, 0)`,
    })
    .from(electives)
    .innerJoin(teachers, eq(teachers.id, electives.teacherId))
    .leftJoin(taken, eq(taken.electiveId, electives.id))
    .where(eq(electives.roundId, round.id))
    .orderBy(asc(electives.title));

  const mine = list.length
    ? await db
        .select({ electiveId: electiveChoices.electiveId, createdAt: electiveChoices.createdAt })
        .from(electiveChoices)
        .where(and(eq(electiveChoices.studentId, me.id), inArray(electiveChoices.electiveId, list.map((e) => e.id))))
    : [];

  return {
    round: { ...round, open: round.closesAt > new Date() },
    electives: list.map((e) => ({ ...e, chosen: mine.some((m) => m.electiveId === e.id) })),
    chosenCount: mine.length,
  };
}

export type ElectivesData = NonNullable<Awaited<ReturnType<typeof getElectives>>>;

type ElectiveResult = { ok: true } | { ok: false; error: string };

/**
 * Записаться на электив. Строка электива блокируется (SELECT … FOR UPDATE),
 * поэтому два студента не займут последнее место одновременно.
 */
export async function chooseElective(electiveId: string): Promise<ElectiveResult> {
  const me = await getProfile();
  if (!/^[0-9a-f-]{36}$/i.test(electiveId)) notFound();
  return db.transaction(async (tx) => {
    const [row] = await tx
      .select({ elective: electives, round: electiveRounds })
      .from(electives)
      .innerJoin(electiveRounds, eq(electiveRounds.id, electives.roundId))
      .where(and(eq(electives.id, electiveId), eq(electiveRounds.course, me.course)))
      .for("update", { of: electives });
    if (!row) notFound();
    if (row.round.closesAt <= new Date()) return { ok: false, error: "Запись уже закрыта" };

    const roundElectives = tx.select({ id: electives.id }).from(electives).where(eq(electives.roundId, row.round.id));
    const mine = await tx
      .select({ electiveId: electiveChoices.electiveId })
      .from(electiveChoices)
      .where(and(eq(electiveChoices.studentId, me.id), inArray(electiveChoices.electiveId, roundElectives)));
    if (mine.some((m) => m.electiveId === electiveId)) return { ok: true };
    if (mine.length >= row.round.pick) {
      return { ok: false, error: `Можно выбрать не больше ${row.round.pick}. Сначала откажитесь от одной из выбранных дисциплин.` };
    }
    const [{ n }] = await tx
      .select({ n: sql<number>`count(*)::int` })
      .from(electiveChoices)
      .where(eq(electiveChoices.electiveId, electiveId));
    if (n >= row.elective.capacity) return { ok: false, error: "Места закончились — выберите другую дисциплину" };

    await tx.insert(electiveChoices).values({ studentId: me.id, electiveId });
    return { ok: true };
  });
}

export async function dropElective(electiveId: string): Promise<ElectiveResult> {
  const me = await getProfile();
  if (!/^[0-9a-f-]{36}$/i.test(electiveId)) notFound();
  const [row] = await db
    .select({ closesAt: electiveRounds.closesAt })
    .from(electives)
    .innerJoin(electiveRounds, eq(electiveRounds.id, electives.roundId))
    .where(and(eq(electives.id, electiveId), eq(electiveRounds.course, me.course)));
  if (!row) notFound();
  if (row.closesAt <= new Date()) return { ok: false, error: "Запись уже закрыта, изменить выбор нельзя" };
  await db.delete(electiveChoices).where(and(eq(electiveChoices.studentId, me.id), eq(electiveChoices.electiveId, electiveId)));
  return { ok: true };
}
