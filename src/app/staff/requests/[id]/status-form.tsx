"use client";

import { useActionState } from "react";
import { LoaderCircle } from "lucide-react";
import { STATUS_LABEL, type RequestStatus } from "@/lib/request-types";
import type { StaffFormState } from "../../actions";

const ACTION_LABEL: Partial<Record<RequestStatus, string>> = {
  in_review: "Взять в работу",
  needs_info: "Запросить уточнение",
  ready: "Документ готов",
  done: "Выдан студенту",
  rejected: "Отклонить",
};

export function StatusForm({
  allowed,
  action,
}: {
  allowed: RequestStatus[];
  action: (prev: StaffFormState, fd: FormData) => Promise<StaffFormState>;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  if (!allowed.length) return <p className="text-sm text-muted">Заявка закрыта, действий нет.</p>;
  return (
    <form action={formAction} className="space-y-3">
      <div>
        <label htmlFor="comment" className="label">
          Комментарий студенту
        </label>
        <textarea
          id="comment"
          name="comment"
          rows={3}
          maxLength={1000}
          className="input py-2.5"
          placeholder="Обязателен для «уточнения» и «отклонить»"
        />
      </div>
      {state?.error && (
        <p role="alert" className="rounded-xl bg-bad-soft px-3 py-2 text-sm font-medium text-bad">
          {state.error}
        </p>
      )}
      {state?.ok && (
        <p role="status" className="rounded-xl bg-ok-soft px-3 py-2 text-sm font-medium text-ok">
          {state.ok}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        {allowed.map((s) => (
          <button
            key={s}
            name="status"
            value={s}
            disabled={pending}
            className={`btn ${s === "rejected" ? "btn-ghost text-bad" : s === "needs_info" ? "btn-secondary" : "btn-primary"}`}
          >
            {pending && <LoaderCircle className="size-4 animate-spin" />}
            {ACTION_LABEL[s] ?? STATUS_LABEL[s]}
          </button>
        ))}
      </div>
    </form>
  );
}
