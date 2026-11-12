"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { markNotificationsRead } from "@/lib/dal/student";

export async function markAllReadAction() {
  await markNotificationsRead();
  revalidatePath("/", "layout");
}

/** Отметить прочитанным и перейти по ссылке уведомления */
export async function openNotificationAction(id: string, link: string | null) {
  await markNotificationsRead([id]);
  revalidatePath("/", "layout");
  // переходим только по внутренним ссылкам
  redirect(link && link.startsWith("/") && !link.startsWith("//") ? link : "/notifications");
}
