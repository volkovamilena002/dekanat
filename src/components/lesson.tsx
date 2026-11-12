import type { ReactNode } from "react";
import { ArrowLeftRight, CircleX, DoorOpen, MapPin, Repeat2, UserRound } from "lucide-react";
import type { Lesson } from "@/lib/dal/student";
import { PAIRS } from "@/lib/time";
import { Chip } from "./ui";

export const LESSON_TYPE: Record<Lesson["type"], string> = {
  lecture: "Лекция",
  practice: "Практика",
  lab: "Лабораторная",
  seminar: "Семинар",
};

export function isChanged(l: Pick<Lesson, "status" | "changeNote">) {
  return l.status !== "normal" || !!l.changeNote;
}

/** Пара фактически проходит в этот слот (не отменена и не перенесена отсюда) */
export function isHeld(l: Pick<Lesson, "status">) {
  return l.status !== "cancelled" && l.status !== "moved";
}

export function ChangeChip({ lesson }: { lesson: Pick<Lesson, "status" | "changeNote"> }) {
  switch (lesson.status) {
    case "cancelled":
      return <Chip tone="bad" icon={CircleX}>Отменена</Chip>;
    case "moved":
      return <Chip tone="warn" icon={ArrowLeftRight}>Перенесена</Chip>;
    case "room_changed":
      return <Chip tone="info" icon={DoorOpen}>Новая аудитория</Chip>;
    case "replaced":
      return <Chip tone="info" icon={Repeat2}>Замена</Chip>;
    default:
      return lesson.changeNote ? <Chip tone="accent" icon={ArrowLeftRight}>Перенос</Chip> : null;
  }
}

export function LessonRow({ lesson, now = false, action }: { lesson: Lesson; now?: boolean; action?: ReactNode }) {
  const time = PAIRS[lesson.pair];
  const off = !isHeld(lesson);
  return (
    <li
      className={`flex gap-3 rounded-2xl border p-3.5 sm:gap-4 sm:p-4 ${
        now ? "border-accent-ink bg-accent-soft/50" : off ? "border-dashed border-line bg-surface-2/50" : "border-line bg-surface"
      }`}
    >
      <div className="w-14 shrink-0 text-center sm:w-16">
        <p className={`text-[15px] font-bold ${off ? "text-muted line-through" : ""}`}>{time.start}</p>
        <p className="text-xs text-muted">{time.end}</p>
        <p className="mt-1 text-[11px] text-muted">{lesson.pair} пара</p>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-medium text-muted">{LESSON_TYPE[lesson.type]}</span>
          {now && <Chip tone="accent">Идёт сейчас</Chip>}
          <ChangeChip lesson={lesson} />
        </div>
        <p className={`mt-0.5 font-semibold leading-snug ${off ? "text-muted line-through" : ""}`}>{lesson.subject}</p>
        <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
          <span className="inline-flex items-center gap-1">
            <MapPin className="size-4" aria-hidden />
            <span className={lesson.status === "room_changed" ? "font-semibold text-info" : ""}>{lesson.room}</span>
          </span>
          <span className="inline-flex min-w-0 items-center gap-1">
            <UserRound className="size-4 shrink-0" aria-hidden />
            <span className="truncate">{lesson.teacher}</span>
          </span>
        </div>
        {lesson.changeNote && (
          <p className={`mt-2 rounded-lg px-2.5 py-1.5 text-sm ${lesson.status === "cancelled" ? "bg-bad-soft text-bad" : "bg-warn-soft text-warn"}`}>
            {lesson.changeNote}
          </p>
        )}
        {action && <div className="mt-3">{action}</div>}
      </div>
    </li>
  );
}
