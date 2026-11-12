"use client";

import { useActionState, useState } from "react";
import { ArrowLeftRight, BellRing, CircleX, DoorOpen, LoaderCircle, Repeat2, type LucideIcon } from "lucide-react";
import { PAIRS } from "@/lib/time";
import type { StaffFormState } from "../../actions";

type Kind = "move" | "cancel" | "room" | "replace";

const KINDS: { kind: Kind; label: string; icon: LucideIcon }[] = [
  { kind: "move", label: "Перенести", icon: ArrowLeftRight },
  { kind: "cancel", label: "Отменить", icon: CircleX },
  { kind: "room", label: "Аудитория", icon: DoorOpen },
  { kind: "replace", label: "Замена", icon: Repeat2 },
];

const SUBMIT: Record<Kind, string> = {
  move: "Перенести пару",
  cancel: "Отменить пару",
  room: "Сменить аудиторию",
  replace: "Назначить замену",
};

export function LessonForm({
  action,
  today,
  currentRoom,
  freeRooms,
  teachers,
  audience,
}: {
  action: (prev: StaffFormState, fd: FormData) => Promise<StaffFormState>;
  today: string;
  currentRoom: string;
  freeRooms: string[];
  teachers: { id: string; fullName: string }[];
  audience: string;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const [kind, setKind] = useState<Kind>("move");
  const [room, setRoom] = useState("");
  const err = state?.errors ?? {};
  const v = state?.values ?? {};
  // Новый ключ после каждой отправки — поля пересоздаются со значениями из v
  const fieldsKey = JSON.stringify(v);

  const fieldError = (name: string) =>
    err[name] ? (
      <p id={`${name}-error`} className="mt-1.5 text-sm font-medium text-bad">
        {err[name]}
      </p>
    ) : null;

  return (
    <form action={formAction} className="space-y-4">
      <fieldset>
        <legend className="label">Что сделать</legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {KINDS.map(({ kind: k, label, icon: Icon }) => (
            <label
              key={k}
              className="flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-line px-3 text-sm font-medium has-checked:border-accent-ink has-checked:bg-accent-soft has-checked:text-accent-ink has-focus-visible:ring-2 has-focus-visible:ring-accent-ink"
            >
              <input type="radio" name="kind" value={k} checked={kind === k} onChange={() => setKind(k)} className="sr-only" />
              <Icon className="size-4 shrink-0" aria-hidden />
              {label}
            </label>
          ))}
        </div>
      </fieldset>

      <div key={fieldsKey} className="space-y-4">
      {kind === "move" && (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="date" className="label">
                Новая дата
              </label>
              <input id="date" name="date" type="date" min={today} required defaultValue={v.date} className="input" aria-invalid={!!err.date} aria-describedby={err.date ? "date-error" : undefined} />
              {fieldError("date")}
            </div>
            <div>
              <label htmlFor="pair" className="label">
                Пара
              </label>
              <select id="pair" name="pair" required defaultValue={v.pair ?? ""} className="input" aria-invalid={!!err.pair}>
                <option value="" disabled>
                  Выберите
                </option>
                {Object.entries(PAIRS).map(([n, t]) => (
                  <option key={n} value={n}>
                    {n} пара · {t.start}–{t.end}
                  </option>
                ))}
              </select>
              {fieldError("pair")}
            </div>
          </div>
          <div>
            <label htmlFor="room" className="label">
              Аудитория <span className="font-normal text-muted">(если меняется)</span>
            </label>
            <input id="room" name="room" defaultValue={v.room} className="input" placeholder={currentRoom} maxLength={20} aria-invalid={!!err.room} />
            {fieldError("room")}
          </div>
        </>
      )}

      {kind === "room" && (
        <div>
          <label htmlFor="room" className="label">
            Новая аудитория
          </label>
          <input
            id="room"
            name="room"
            required
            className="input"
            maxLength={20}
            value={room}
            onChange={(e) => setRoom(e.target.value)}
            aria-invalid={!!err.room}
            aria-describedby="rooms-hint"
          />
          {fieldError("room")}
          {freeRooms.length > 0 && (
            <div id="rooms-hint" className="mt-2">
              <p className="mb-1.5 text-xs text-muted">Свободны в это время:</p>
              <div className="flex flex-wrap gap-1.5">
                {freeRooms.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRoom(r)}
                    className={`min-h-9 rounded-lg border px-2.5 text-sm ${room === r ? "border-accent-ink bg-accent-soft text-accent-ink" : "border-line hover:border-accent-ink"}`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {kind === "replace" && (
        <div>
          <label htmlFor="teacherId" className="label">
            Кто проведёт пару
          </label>
          <select id="teacherId" name="teacherId" required defaultValue={v.teacherId ?? ""} className="input" aria-invalid={!!err.teacherId}>
            <option value="" disabled>
              Выберите преподавателя
            </option>
            {teachers.map((t) => (
              <option key={t.id} value={t.id}>
                {t.fullName}
              </option>
            ))}
          </select>
          {fieldError("teacherId")}
        </div>
      )}

      <div>
        <label htmlFor="reason" className="label">
          {kind === "cancel" ? "Причина" : "Комментарий для студентов"}{" "}
          {kind !== "cancel" && <span className="font-normal text-muted">(необязательно)</span>}
        </label>
        <textarea
          id="reason"
          name="reason"
          rows={2}
          maxLength={200}
          defaultValue={v.reason}
          required={kind === "cancel"}
          className="input py-2.5"
          placeholder={kind === "cancel" ? "Например: преподаватель на конференции" : "Например: возьмите ноутбуки"}
          aria-invalid={!!err.reason}
        />
        {fieldError("reason")}
      </div>
      </div>

      <p className="flex items-start gap-2 rounded-xl bg-info-soft px-3 py-2 text-sm text-info">
        <BellRing className="mt-0.5 size-4 shrink-0" aria-hidden />
        Уведомление сразу получат {audience}. Изменение появится у них в расписании и в календаре.
      </p>

      {state?.error && (
        <p role="alert" className="rounded-xl bg-bad-soft px-3 py-2 text-sm font-medium text-bad">
          {state.error}
        </p>
      )}

      <button className={`btn ${kind === "cancel" ? "btn-secondary text-bad" : "btn-primary"} w-full sm:w-auto`} disabled={pending}>
        {pending && <LoaderCircle className="size-4 animate-spin" />}
        {SUBMIT[kind]}
      </button>
    </form>
  );
}
