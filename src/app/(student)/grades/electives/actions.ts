"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { chooseElective, dropElective } from "@/lib/dal/student";

export type ElectiveState = { error?: string } | undefined;

const Input = z.object({ id: z.uuid(), op: z.enum(["choose", "drop"]) });

export async function toggleElectiveAction(_prev: ElectiveState, formData: FormData): Promise<ElectiveState> {
  const parsed = Input.safeParse({ id: formData.get("id"), op: formData.get("op") });
  if (!parsed.success) return { error: "Некорректный запрос" };
  const res = parsed.data.op === "choose" ? await chooseElective(parsed.data.id) : await dropElective(parsed.data.id);
  if (!res.ok) return { error: res.error };
  revalidatePath("/grades/electives");
  revalidatePath("/");
  return undefined;
}
