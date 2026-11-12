"use server";

import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db, schema } from "@/db";
import { fakeVerify, verifyPassword } from "@/lib/auth/password";
import { lockedMinutes, registerFailure, resetFailures } from "@/lib/auth/rate-limit";
import { createSession, destroySession } from "@/lib/auth/session";
import { plural } from "@/lib/time";

export type LoginState = { error?: string; login?: string } | undefined;

const Input = z.object({
  login: z.string().trim().toLowerCase().min(1, "Введите логин").max(64),
  password: z.string().min(1, "Введите пароль").max(128),
});

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = Input.safeParse({ login: formData.get("login"), password: formData.get("password") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message, login: String(formData.get("login") ?? "") };
  }
  const { login, password } = parsed.data;

  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0].trim() || h.get("x-real-ip") || "local";
  const keys = [`login:${login}`, `ip:${ip}`];
  const wait = lockedMinutes(keys);
  if (wait) {
    return { error: `Слишком много попыток. Попробуйте через ${wait} ${plural(wait, ["минуту", "минуты", "минут"])}.`, login };
  }

  const [user] = await db
    .select({ id: schema.users.id, hash: schema.users.passwordHash, role: schema.users.role })
    .from(schema.users)
    .where(eq(schema.users.login, login));

  const ok = user ? await verifyPassword(user.hash, password) : await fakeVerify(password);
  if (!user || !ok) {
    registerFailure(keys);
    return { error: "Неверный логин или пароль", login };
  }

  resetFailures(keys);
  await createSession(user.id);
  redirect(user.role === "staff" ? "/staff" : "/");
}

export async function logout() {
  await destroySession();
  redirect("/login");
}
