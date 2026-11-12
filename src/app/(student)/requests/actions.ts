"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { answerRequest, cancelRequest, createRequest } from "@/lib/dal/student";
import { requestTypeByKey, type Field } from "@/lib/request-types";

export type FormState = { errors?: Record<string, string>; message?: string; values?: Record<string, string> } | undefined;

function fieldSchema(f: Field) {
  switch (f.kind) {
    case "select":
      return z.enum(f.options as [string, ...string[]], { message: "Выберите вариант из списка" });
    case "number":
      return z.coerce
        .number({ message: "Введите число" })
        .int("Введите целое число")
        .min(f.min, `Не меньше ${f.min}`)
        .max(f.max, `Не больше ${f.max}`)
        .transform(String);
    case "date":
      return z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Укажите дату");
    default:
      return z.string().trim().max(f.maxLength, `Не длиннее ${f.maxLength} символов`);
  }
}

export async function submitRequest(typeKey: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const type = requestTypeByKey(typeKey);
  if (!type) return { message: "Неизвестный тип заявки" };

  const values: Record<string, string> = {};
  const errors: Record<string, string> = {};
  for (const f of type.fields) {
    const raw = String(formData.get(f.name) ?? "").trim();
    values[f.name] = raw;
    if (!raw) {
      if (f.required) errors[f.name] = "Обязательное поле";
      continue;
    }
    const r = fieldSchema(f).safeParse(raw);
    if (r.success) values[f.name] = String(r.data);
    else errors[f.name] = r.error.issues[0].message;
  }
  if (type.key === "income_certificate" && values.from && values.to && values.from > values.to) {
    errors.to = "Конец периода раньше начала";
  }
  if (Object.keys(errors).length) return { errors, values };

  const payload = Object.fromEntries(Object.entries(values).filter(([, v]) => v));
  const req = await createRequest(type.key, payload);
  revalidatePath("/requests");
  redirect(`/requests/${req.id}?created=1`);
}

export async function cancelRequestAction(id: string) {
  await cancelRequest(id);
  revalidatePath(`/requests/${id}`);
}

export async function answerRequestAction(id: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const comment = z.string().trim().min(3, "Напишите пару слов").max(1000).safeParse(formData.get("comment"));
  if (!comment.success) return { errors: { comment: comment.error.issues[0].message } };
  await answerRequest(id, comment.data);
  revalidatePath(`/requests/${id}`);
  return { message: "Ответ отправлен в деканат" };
}
