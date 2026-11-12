import "server-only";
import { and, eq, inArray } from "drizzle-orm";
import { db, schema } from "@/db";
import { requestTypeByKey } from "@/lib/request-types";

/**
 * Публичная проверка подлинности справки по коду.
 * Возвращает минимум данных: тип, номер, дата, фамилия с маской и инициалы.
 */
export async function verifyDocument(code: string) {
  const clean = code.trim().toUpperCase();
  if (!/^[0-9A-F]{10}$/.test(clean)) return null;
  const [row] = await db
    .select({
      number: schema.requests.number,
      type: schema.requests.type,
      updatedAt: schema.requests.updatedAt,
      lastName: schema.users.lastName,
      firstName: schema.users.firstName,
      middleName: schema.users.middleName,
    })
    .from(schema.requests)
    .innerJoin(schema.users, eq(schema.users.id, schema.requests.studentId))
    .where(and(eq(schema.requests.verifyCode, clean), inArray(schema.requests.status, ["ready", "done"])));
  if (!row) return null;
  const masked = `${row.lastName[0]}${"•".repeat(Math.max(2, row.lastName.length - 1))}`;
  return {
    number: row.number,
    title: requestTypeByKey(row.type)?.title ?? "Документ",
    issuedAt: row.updatedAt,
    holder: `${masked} ${row.firstName[0]}. ${row.middleName ? `${row.middleName[0]}.` : ""}`.trim(),
  };
}
