"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { changeLesson, changeRequestStatus, publishNotification, type LessonChange } from "@/lib/dal/staff";
import { requestStatusEnum } from "@/db/schema";

export type StaffFormState =
  | { error?: string; ok?: string; errors?: Record<string, string>; values?: Record<string, string> }
  | undefined;

const StatusInput = z.object({
  status: z.enum(requestStatusEnum.enumValues),
  comment: z.string().trim().max(1000).optional(),
});

export async function changeStatusAction(id: string, _prev: StaffFormState, formData: FormData): Promise<StaffFormState> {
  const parsed = StatusInput.safeParse({ status: formData.get("status"), comment: formData.get("comment") ?? undefined });
  if (!parsed.success) return { error: "Некорректные данные формы" };
  const { status, comment } = parsed.data;
  if ((status === "needs_info" || status === "rejected") && !comment) {
    return { error: "Напишите студенту, что нужно уточнить или почему заявка отклонена" };
  }
  const res = await changeRequestStatus(id, status, comment || null);
  if (!res.ok) return { error: res.error };
  revalidatePath(`/staff/requests/${id}`);
  revalidatePath("/staff");
  return { ok: "Статус обновлён, студент получил уведомление" };
}

const Announcement = z.object({
  title: z.string().trim().min(3, "Заголовок слишком короткий").max(120, "Не длиннее 120 символов"),
  body: z.string().trim().min(5, "Добавьте текст объявления").max(2000, "Не длиннее 2000 символов"),
  category: z.enum(["news", "deadline"]),
  groupId: z.union([z.literal("all"), z.uuid()]),
  dueAt: z.string().optional(),
  important: z.literal("on").optional(),
});

export async function publishAction(_prev: StaffFormState, formData: FormData): Promise<StaffFormState> {
  const parsed = Announcement.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const i of parsed.error.issues) errors[String(i.path[0])] ??= i.message;
    return { errors };
  }
  const d = parsed.data;
  let dueAt: Date | null = null;
  if (d.category === "deadline") {
    if (!d.dueAt || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(d.dueAt)) return { errors: { dueAt: "Укажите срок дедлайна" } };
    dueAt = new Date(`${d.dueAt}:00+03:00`);
  }
  await publishNotification({
    groupId: d.groupId === "all" ? null : d.groupId,
    category: d.category,
    title: d.title,
    body: d.body,
    important: d.important === "on",
    dueAt,
  });
  revalidatePath("/staff/announce");
  return { ok: "Объявление опубликовано — студенты уже видят его в ленте" };
}

// ---------- Изменение пары ----------

const Room = z
  .string()
  .trim()
  .min(1, "Укажите аудиторию")
  .max(20, "Не длиннее 20 символов")
  .regex(/^[\p{L}\d\- .]+$/u, "Только буквы, цифры и дефис");
const Reason = z.string().trim().max(200, "Не длиннее 200 символов");

const LessonInput = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("cancel"), reason: Reason.min(3, "Укажите причину — её увидят студенты") }),
  z.object({ kind: z.literal("room"), room: Room, reason: Reason.optional() }),
  z.object({
    kind: z.literal("move"),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Укажите дату"),
    pair: z.coerce.number({ message: "Выберите пару" }).int().min(1, "Выберите пару").max(7, "Выберите пару"),
    room: z.union([z.literal(""), Room]).optional(),
    reason: Reason.optional(),
  }),
  z.object({ kind: z.literal("replace"), teacherId: z.uuid("Выберите преподавателя"), reason: Reason.optional() }),
]);

export async function changeLessonAction(id: string, _prev: StaffFormState, formData: FormData): Promise<StaffFormState> {
  // Введённое возвращаем в форму: React 19 очищает поля после отправки
  const values = Object.fromEntries(
    [...formData.entries()].filter(([k, v]) => typeof v === "string" && !k.startsWith("$")),
  ) as Record<string, string>;
  const parsed = LessonInput.safeParse(values);
  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const i of parsed.error.issues) errors[String(i.path[0] ?? "kind")] ??= i.message;
    return { errors, values };
  }
  const d = parsed.data;
  const change: LessonChange =
    d.kind === "cancel"
      ? d
      : d.kind === "move"
        ? { kind: "move", date: d.date, pair: d.pair, room: d.room || null, reason: d.reason || null }
        : { ...d, reason: d.reason || null };

  const res = await changeLesson(id, change);
  if (!res.ok) return { error: res.error, values };
  revalidatePath("/staff/schedule");
  redirect(`/staff/schedule?group=${res.groupId}&date=${res.date}&notified=${res.notified}`);
}
