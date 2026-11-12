"use client";

import { useActionState, useState } from "react";
import { LoaderCircle, Megaphone } from "lucide-react";
import { publishAction } from "../actions";

export function AnnounceForm({ groups }: { groups: { id: string; name: string }[] }) {
  const [state, action, pending] = useActionState(publishAction, undefined);
  const [category, setCategory] = useState<"news" | "deadline">("news");
  const err = state?.errors ?? {};

  return (
    <form action={action} className="space-y-4" key={state?.ok}>
      <fieldset>
        <legend className="label">Тип</legend>
        <div className="grid grid-cols-2 gap-2">
          {(
            [
              ["news", "Новость"],
              ["deadline", "Дедлайн"],
            ] as const
          ).map(([v, l]) => (
            <label
              key={v}
              className="flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-line px-3.5 text-sm has-checked:border-accent-ink has-checked:bg-accent-soft"
            >
              <input type="radio" name="category" value={v} checked={category === v} onChange={() => setCategory(v)} className="accent-[var(--accent)]" />
              {l}
            </label>
          ))}
        </div>
      </fieldset>
      <div>
        <label htmlFor="groupId" className="label">
          Кому
        </label>
        <select id="groupId" name="groupId" className="input">
          <option value="all">Всем студентам</option>
          {groups.map((g) => (
            <option key={g.id} value={g.id}>
              Группа {g.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="title" className="label">
          Заголовок
        </label>
        <input id="title" name="title" className="input" maxLength={120} aria-invalid={!!err.title} />
        {err.title && <p className="mt-1.5 text-sm font-medium text-bad">{err.title}</p>}
      </div>
      <div>
        <label htmlFor="body" className="label">
          Текст
        </label>
        <textarea id="body" name="body" rows={4} className="input py-2.5" maxLength={2000} aria-invalid={!!err.body} />
        {err.body && <p className="mt-1.5 text-sm font-medium text-bad">{err.body}</p>}
      </div>
      {category === "deadline" && (
        <div>
          <label htmlFor="dueAt" className="label">
            Срок (по Москве)
          </label>
          <input id="dueAt" name="dueAt" type="datetime-local" className="input" aria-invalid={!!err.dueAt} />
          {err.dueAt && <p className="mt-1.5 text-sm font-medium text-bad">{err.dueAt}</p>}
        </div>
      )}
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="important" className="size-4 accent-[var(--accent)]" /> Важное (выделить в ленте)
      </label>
      {state?.ok && (
        <p role="status" className="rounded-xl bg-ok-soft px-3 py-2 text-sm font-medium text-ok">
          {state.ok}
        </p>
      )}
      <button className="btn btn-primary" disabled={pending}>
        {pending ? <LoaderCircle className="size-4 animate-spin" /> : <Megaphone className="size-4" />}
        Опубликовать
      </button>
    </form>
  );
}
