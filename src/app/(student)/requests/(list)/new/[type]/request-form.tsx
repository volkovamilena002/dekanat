"use client";

import { useActionState } from "react";
import { LoaderCircle, Send } from "lucide-react";
import type { Field } from "@/lib/request-types";
import type { FormState } from "../../../actions";

export function RequestForm({
  fields,
  action,
  defaults,
}: {
  fields: Field[];
  action: (prev: FormState, fd: FormData) => Promise<FormState>;
  defaults: Record<string, string>;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const values = state?.values ?? defaults;

  return (
    <form action={formAction} className="space-y-5" noValidate>
      {fields.map((f) => {
        const err = state?.errors?.[f.name];
        const id = `f-${f.name}`;
        const common = {
          id,
          name: f.name,
          defaultValue: values[f.name] ?? "",
          "aria-invalid": !!err,
          "aria-describedby": err ? `${id}-err` : undefined,
          required: f.required,
        };
        return (
          <div key={f.name}>
            <label htmlFor={id} className="label">
              {f.label}
              {!f.required && <span className="font-normal text-muted"> — по желанию</span>}
            </label>
            {f.kind === "select" ? (
              f.options.length <= 3 ? (
                <div className="grid gap-2" role="radiogroup" aria-labelledby={id}>
                  {f.options.map((o, i) => (
                    <label
                      key={o}
                      className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm has-checked:border-accent-ink has-checked:bg-accent-soft"
                    >
                      <input
                        type="radio"
                        name={f.name}
                        value={o}
                        defaultChecked={(values[f.name] || (i === 0 ? o : "")) === o}
                        className="size-4 accent-[var(--accent)]"
                      />
                      {o}
                    </label>
                  ))}
                </div>
              ) : (
                <select {...common} className="input appearance-none">
                  {f.options.map((o) => (
                    <option key={o}>{o}</option>
                  ))}
                </select>
              )
            ) : f.kind === "number" ? (
              <input {...common} type="number" inputMode="numeric" min={f.min} max={f.max} className="input w-32" />
            ) : f.kind === "date" ? (
              <input {...common} type="date" className="input" />
            ) : f.kind === "textarea" ? (
              <textarea {...common} maxLength={f.maxLength} rows={4} placeholder={f.placeholder} className="input py-2.5" />
            ) : (
              <input {...common} maxLength={f.maxLength} placeholder={f.placeholder} className="input" />
            )}
            {err && (
              <p id={`${id}-err`} className="mt-1.5 text-sm font-medium text-bad">
                {err}
              </p>
            )}
          </div>
        );
      })}

      {state?.message && (
        <p role="alert" className="rounded-xl bg-bad-soft px-3.5 py-2.5 text-sm font-medium text-bad">
          {state.message}
        </p>
      )}

      <button type="submit" className="btn btn-primary w-full sm:w-auto" disabled={pending}>
        {pending ? <LoaderCircle className="size-4 animate-spin" /> : <Send className="size-4" />}
        {pending ? "Отправляем…" : "Отправить заявку"}
      </button>
    </form>
  );
}
