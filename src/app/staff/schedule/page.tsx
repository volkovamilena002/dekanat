import type { Metadata } from "next";
import Link from "next/link";
import { BellRing, CalendarCheck2, ChevronLeft, ChevronRight, PencilLine } from "lucide-react";
import { isChanged, LessonRow } from "@/components/lesson";
import { EmptyState, PageHeader } from "@/components/ui";
import { getGroupLessons, isEditable, listGroupsWithSize } from "@/lib/dal/staff";
import { addDays, formatDay, formatDayLong, plural, startOfWeek, todayMsk, weekday, weekdayShort } from "@/lib/time";

export const metadata: Metadata = { title: "Расписание групп" };

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export default async function StaffSchedulePage({ searchParams }: PageProps<"/staff/schedule">) {
  const sp = await searchParams;
  const today = todayMsk();
  const groups = await listGroupsWithSize();
  const group = groups.find((g) => g.id === sp.group) ?? groups[0];
  if (!group) {
    return (
      <div className="card">
        <EmptyState icon={CalendarCheck2} title="Групп пока нет" />
      </div>
    );
  }
  let selected = typeof sp.date === "string" && DATE_RE.test(sp.date) ? sp.date : today;
  if (weekday(selected) === 7) selected = addDays(selected, 1);
  const monday = startOfWeek(selected);
  const days = Array.from({ length: 6 }, (_, i) => addDays(monday, i));
  const lessons = await getGroupLessons(group.id, monday, addDays(monday, 6));
  const dayLessons = lessons.filter((l) => l.date === selected);
  const notified = typeof sp.notified === "string" ? Number(sp.notified) : null;
  const href = (date: string, g = group.id) => `/staff/schedule?group=${g}&date=${date}`;

  return (
    <div>
      <PageHeader title="Расписание групп" subtitle="Перенос, отмена, замена аудитории или преподавателя — группа сразу получит уведомление" />

      {notified !== null && Number.isFinite(notified) && (
        <p role="status" className="mb-4 flex items-start gap-2 rounded-xl bg-ok-soft px-3.5 py-2.5 text-sm font-medium text-ok">
          <BellRing className="mt-0.5 size-4 shrink-0" aria-hidden />
          Изменение сохранено. Уведомление отправлено {notified} {plural(notified, ["студенту", "студентам", "студентам"])} группы {group.name}.
        </p>
      )}

      <nav aria-label="Группа" className="-mx-4 mb-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <ul className="flex gap-2">
          {groups.map((g) => (
            <li key={g.id}>
              <Link
                href={href(selected, g.id)}
                aria-current={g.id === group.id ? "page" : undefined}
                className={`inline-flex min-h-10 items-center gap-1.5 rounded-full border px-4 text-sm font-medium whitespace-nowrap ${
                  g.id === group.id ? "border-accent-ink bg-accent text-on-accent" : "border-line bg-surface hover:border-accent-ink"
                }`}
              >
                {g.name}
                <span className={g.id === group.id ? "opacity-90" : "text-muted"}>
                  {g.size} {plural(g.size, ["студент", "студента", "студентов"])}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <div className="card mb-5 p-2 sm:p-3">
        <div className="flex items-center gap-1 sm:gap-2">
          <Link href={href(addDays(monday, -7))} className="grid size-10 shrink-0 place-items-center rounded-xl text-muted hover:bg-surface-2 hover:text-ink" aria-label="Предыдущая неделя">
            <ChevronLeft className="size-5" />
          </Link>
          <ol className="grid flex-1 grid-cols-6 gap-1">
            {days.map((d) => {
              const active = d === selected;
              const changed = lessons.some((l) => l.date === d && isChanged(l));
              return (
                <li key={d}>
                  <Link
                    href={href(d)}
                    aria-current={active ? "date" : undefined}
                    className={`relative flex flex-col items-center rounded-xl py-2 ${
                      active ? "bg-accent text-on-accent" : d === today ? "bg-accent-soft text-accent-ink" : "hover:bg-surface-2"
                    }`}
                  >
                    <span className={`text-[11px] font-medium uppercase ${active ? "" : "text-muted"}`}>{weekdayShort(d)}</span>
                    <span className="text-lg leading-tight font-bold">{Number(d.slice(8))}</span>
                    <span className={`mt-0.5 size-1.5 rounded-full ${changed ? "bg-warn" : "bg-transparent"}`} aria-hidden />
                    {changed && <span className="sr-only">, есть изменения</span>}
                  </Link>
                </li>
              );
            })}
          </ol>
          <Link href={href(addDays(monday, 7))} className="grid size-10 shrink-0 place-items-center rounded-xl text-muted hover:bg-surface-2 hover:text-ink" aria-label="Следующая неделя">
            <ChevronRight className="size-5" />
          </Link>
        </div>
        <p className="mt-2 text-center text-xs text-muted">
          {formatDay(monday)} – {formatDay(addDays(monday, 5))}
        </p>
      </div>

      <h2 className="mb-3 text-base font-semibold first-letter:uppercase">
        {formatDayLong(selected)} · {group.name}
        {selected === today && <span className="ml-2 text-sm font-normal text-muted">сегодня</span>}
      </h2>
      {dayLessons.length ? (
        <ul className="space-y-2.5">
          {dayLessons.map((l) => (
            <LessonRow
              key={l.id}
              lesson={l}
              action={
                isEditable(l, today) ? (
                  <Link href={`/staff/schedule/${l.id}`} className="btn btn-secondary h-9 px-3 text-sm">
                    <PencilLine className="size-4" aria-hidden /> Изменить
                  </Link>
                ) : null
              }
            />
          ))}
        </ul>
      ) : (
        <div className="card">
          <EmptyState icon={CalendarCheck2} title="Пар нет" text="В этот день у группы нет занятий." />
        </div>
      )}
    </div>
  );
}
