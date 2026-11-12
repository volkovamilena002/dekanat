import type { Metadata } from "next";
import Link from "next/link";
import { CalendarCheck2, ChevronLeft, ChevronRight, Download } from "lucide-react";
import { isChanged, LessonRow } from "@/components/lesson";
import { EmptyState, PageHeader } from "@/components/ui";
import { getLessons } from "@/lib/dal/student";
import { addDays, formatDay, formatDayLong, minutesNowMsk, PAIRS, plural, startOfWeek, todayMsk, toMinutes, weekdayShort } from "@/lib/time";

export const metadata: Metadata = { title: "Расписание" };

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export default async function SchedulePage({ searchParams }: PageProps<"/schedule">) {
  const sp = await searchParams;
  const today = todayMsk();
  const raw = typeof sp.date === "string" && DATE_RE.test(sp.date) ? sp.date : today;
  const selected = raw;
  const monday = startOfWeek(selected);
  const days = Array.from({ length: 6 }, (_, i) => addDays(monday, i));
  const lessons = await getLessons(monday, addDays(monday, 6));
  const dayLessons = lessons.filter((l) => l.date === selected);
  const weekChanges = lessons.filter(isChanged);
  const now = minutesNowMsk();

  const weekLabel = `${formatDay(monday)} – ${formatDay(addDays(monday, 5))}`;
  const isThisWeek = monday === startOfWeek(today);

  return (
    <div>
      <PageHeader
        title="Расписание"
        subtitle={isThisWeek ? `Текущая неделя · ${weekLabel}` : weekLabel}
        action={
          <a href="/schedule/calendar.ics" className="btn btn-secondary" download>
            <Download className="size-4" /> В календарь
          </a>
        }
      />

      {/* Переключатель недели и дней */}
      <div className="card mb-5 p-2 sm:p-3">
        <div className="flex items-center gap-1 sm:gap-2">
          <Link
            href={`/schedule?date=${addDays(monday, -7)}`}
            className="grid size-10 shrink-0 place-items-center rounded-xl text-muted hover:bg-surface-2 hover:text-ink"
            aria-label="Предыдущая неделя"
          >
            <ChevronLeft className="size-5" />
          </Link>
          <ol className="grid flex-1 grid-cols-6 gap-1">
            {days.map((d) => {
              const count = lessons.filter((l) => l.date === d && l.status !== "cancelled" && l.status !== "moved").length;
              const changed = lessons.some((l) => l.date === d && isChanged(l));
              const active = d === selected;
              return (
                <li key={d}>
                  <Link
                    href={`/schedule?date=${d}`}
                    aria-current={active ? "date" : undefined}
                    className={`relative flex flex-col items-center rounded-xl py-2 transition-colors ${
                      active ? "bg-accent text-on-accent" : d === today ? "bg-accent-soft text-accent-ink" : "hover:bg-surface-2"
                    }`}
                  >
                    <span className={`text-[11px] font-medium uppercase ${active ? "" : "text-muted"}`}>{weekdayShort(d)}</span>
                    <span className="text-lg leading-tight font-bold">{Number(d.slice(8))}</span>
                    <span className={`text-[10px] whitespace-nowrap ${active ? "opacity-90" : "text-muted"}`}>
                      {count ? `${count} ${plural(count, ["пара", "пары", "пар"])}` : "—"}
                    </span>
                    <span className={`mt-1 size-1.5 rounded-full ${changed ? "bg-warn" : "bg-transparent"}`} aria-hidden />
                    {changed && <span className="sr-only">, есть изменения</span>}
                  </Link>
                </li>
              );
            })}
          </ol>
          <Link
            href={`/schedule?date=${addDays(monday, 7)}`}
            className="grid size-10 shrink-0 place-items-center rounded-xl text-muted hover:bg-surface-2 hover:text-ink"
            aria-label="Следующая неделя"
          >
            <ChevronRight className="size-5" />
          </Link>
        </div>
        {!isThisWeek && (
          <div className="mt-2 text-center">
            <Link href="/schedule" className="text-sm font-medium text-accent-ink hover:underline">
              Вернуться к сегодняшнему дню
            </Link>
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="lg:col-span-2" aria-labelledby="day-title">
          <h2 id="day-title" className="mb-3 text-base font-semibold first-letter:uppercase">
            {formatDayLong(selected)}
            {selected === today && <span className="ml-2 text-sm font-normal text-muted">сегодня</span>}
          </h2>
          {dayLessons.length ? (
            <ul className="space-y-2.5">
              {dayLessons.map((l) => (
                <LessonRow
                  key={l.id}
                  lesson={l}
                  now={selected === today && toMinutes(PAIRS[l.pair].start) <= now && now < toMinutes(PAIRS[l.pair].end) && l.status !== "cancelled"}
                />
              ))}
            </ul>
          ) : (
            <div className="card">
              <EmptyState icon={CalendarCheck2} title="Пар нет" text="В этот день занятий не запланировано." />
            </div>
          )}
        </section>

        <aside aria-labelledby="week-changes">
          <h2 id="week-changes" className="mb-3 text-base font-semibold">
            Изменения на неделе
          </h2>
          <div className="card p-4">
            {weekChanges.length ? (
              <ul className="divide-y divide-line">
                {weekChanges.map((l) => (
                  <li key={l.id} className="py-2.5 first:pt-0 last:pb-0">
                    <Link href={`/schedule?date=${l.date}`} className="block hover:text-accent-ink">
                      <span className="text-xs font-medium text-muted">
                        {weekdayShort(l.date)}, {formatDay(l.date)} · {l.pair} пара
                      </span>
                      <span className="block text-sm font-semibold">{l.subject}</span>
                      <span className="block text-sm text-muted">{l.changeNote}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted">На этой неделе всё по плану.</p>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
