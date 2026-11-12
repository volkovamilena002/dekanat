"use client";

import { useActionState } from "react";
import { LoaderCircle, Reply } from "lucide-react";
import type { FormState } from "../actions";

export function AnswerForm({ action }: { action: (prev: FormState, fd: FormData) => Promise<FormState> }) {
  const [state, formAction, pending] = useActionState(action, undefined);
  return (
    <form action={formAction} className="mt-3 space-y-3">
      <label htmlFor="comment" className="sr-only">
        Ответ деканату
      </label>
      <textarea
        id="comment"
        name="comment"
        rows={3}
        maxLength={1000}
        className="input py-2.5"
        placeholder="Например: «Принесу справку завтра до 14:00»"
        aria-invalid={!!state?.errors?.comment}
      />
      {state?.errors?.comment && <p className="text-sm font-medium text-bad">{state.errors.comment}</p>}
      <button className="btn btn-primary" disabled={pending}>
        {pending ? <LoaderCircle className="size-4 animate-spin" /> : <Reply className="size-4" />}
        Ответить
      </button>
    </form>
  );
}
