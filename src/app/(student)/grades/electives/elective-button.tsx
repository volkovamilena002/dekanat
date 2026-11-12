"use client";

import { useActionState } from "react";
import { Check, LoaderCircle, Plus, X } from "lucide-react";
import { toggleElectiveAction } from "./actions";

export function ElectiveButton({
  id,
  chosen,
  disabledReason,
  title,
}: {
  id: string;
  chosen: boolean;
  /** Почему нельзя выбрать (мест нет, лимит, запись закрыта). null — можно. */
  disabledReason: string | null;
  title: string;
}) {
  const [state, action, pending] = useActionState(toggleElectiveAction, undefined);
  return (
    <form action={action} className="mt-4">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="op" value={chosen ? "drop" : "choose"} />
      {chosen ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex h-11 items-center gap-1.5 rounded-xl bg-ok-soft px-3.5 text-sm font-semibold text-ok">
            <Check className="size-4" aria-hidden /> Вы записаны
          </span>
          {!disabledReason && (
            <button className="btn btn-ghost text-muted" disabled={pending} aria-label={`Отказаться от дисциплины «${title}»`}>
              {pending ? <LoaderCircle className="size-4 animate-spin" /> : <X className="size-4" />}
              Отказаться
            </button>
          )}
        </div>
      ) : (
        <button className="btn btn-primary w-full sm:w-auto" disabled={pending || !!disabledReason} aria-label={disabledReason ? undefined : `Выбрать дисциплину «${title}»`}>
          {pending ? <LoaderCircle className="size-4 animate-spin" /> : !disabledReason && <Plus className="size-4" />}
          {disabledReason ?? "Выбрать"}
        </button>
      )}
      {state?.error && (
        <p role="alert" className="mt-2 rounded-xl bg-bad-soft px-3 py-2 text-sm font-medium text-bad">
          {state.error}
        </p>
      )}
    </form>
  );
}
