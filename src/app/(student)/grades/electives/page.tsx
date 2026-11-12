import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, CalendarClock, CircleCheck, Clock, Laptop, ListChecks, UserRound } from "lucide-react";
import { Chip, EmptyState, PageHeader, type Tone } from "@/components/ui";
import { getElectives } from "@/lib/dal/student";
import { dateMsk, daysBetween, formatDateTime, plural, todayMsk } from "@/lib/time";
import { ElectiveButton } from "./elective-button";

export const metadata: Metadata = { title: "Дисциплины по выбору" };

export default async function ElectivesPage() {
  const data = await getElectives();
  const back = (
    <Link href="/grades" className="mb-3 inline-flex items-center gap-1 text-sm font-medium text-muted hover:text-ink">
      <ArrowLeft className="size-4" aria-hidden /> Учёба
    </Link>
  );

  if (!data || !data.electives.length) {
    return (
      <div>
        {back}
        <PageHeader title="Дисциплины по выбору" />
        <div className="card">
          <EmptyState icon={ListChecks} title="Записи пока нет" text="Когда деканат откроет запись на элективы, они появятся здесь, а вы получите уведомление." />
        </div>
      </div>
    );
  }

  const { round, electives, chosenCount } = data;
  const left = daysBetween(todayMsk(), dateMsk(round.closesAt));
  const done = chosenCount >= round.pick;

  return (
    <div>
      {back}
      <PageHeader title="Дисциплины по выбору" subtitle={`На ${round.semester} семестр · выберите ${round.pick} ${plural(round.pick, ["дисциплину", "дисциплины", "дисциплин"])}`} />

      {/* Статус записи */}
      <section className={`card mb-5 flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between ${done ? "border-ok" : ""}`} aria-live="polite">
        <div className="flex items-center gap-3">
          <div className={`grid size-11 shrink-0 place-items-center rounded-2xl ${done ? "bg-ok-soft text-ok" : "bg-accent-soft text-accent-ink"}`}>
            {done ? <CircleCheck className="size-6" aria-hidden /> : <ListChecks className="size-6" aria-hidden />}
          </div>
          <div>
            <p className="font-semibold">{done ? "Выбор сделан" : `Выбрано ${chosenCount} из ${round.pick}`}</p>
            <p className="text-sm text-muted">
              {round.open
                ? done
                  ? "До закрытия записи выбор можно поменять"
                  : `Осталось выбрать ещё ${round.pick - chosenCount}`
                : "Запись закрыта — выбор зафиксирован"}
            </p>
          </div>
        </div>
        <p className="flex flex-wrap items-center gap-1.5 text-sm text-muted">
          <CalendarClock className="size-4" aria-hidden />
          {round.open ? (
            <>
              запись до {formatDateTime(round.closesAt)}
              <Chip tone={left <= 2 ? "bad" : "warn"}>{left <= 0 ? "сегодня" : `ещё ${left} ${plural(left, ["день", "дня", "дней"])}`}</Chip>
            </>
          ) : (
            <>закрыта {formatDateTime(round.closesAt)}</>
          )}
        </p>
      </section>

      <ul className="grid gap-3 md:grid-cols-2">
        {electives.map((e) => {
          const free = Math.max(0, e.capacity - e.taken);
          const reason = !round.open ? "Запись закрыта" : e.chosen ? null : free === 0 ? "Мест нет" : done ? `Уже выбрано ${round.pick}` : null;
          const tone: Tone = free === 0 ? "bad" : free <= 3 ? "warn" : "ok";
          const pct = Math.min(100, Math.round((e.taken / e.capacity) * 100));
          return (
            <li key={e.id} className={`card flex flex-col p-4 sm:p-5 ${e.chosen ? "border-ok ring-1 ring-ok" : ""}`}>
              <div className="flex flex-wrap items-center gap-1.5">
                <Chip icon={Clock}>{e.slot}</Chip>
                <Chip icon={Laptop}>{e.format}</Chip>
              </div>
              <h2 className="mt-2 text-[17px] leading-snug font-semibold">{e.title}</h2>
              <p className="mt-1 flex items-center gap-1 text-sm text-muted">
                <UserRound className="size-4 shrink-0" aria-hidden /> {e.teacher}
              </p>
              <p className="mt-2 flex-1 text-sm">{e.description}</p>

              <div className="mt-4">
                <div className="flex items-center justify-between gap-2 text-sm">
                  <span className="text-muted">
                    Занято {e.taken} из {e.capacity}
                  </span>
                  <Chip tone={tone}>{free === 0 ? "мест нет" : `свободно ${free}`}</Chip>
                </div>
                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-surface-2" role="img" aria-label={`Занято ${e.taken} мест из ${e.capacity}`}>
                  <div className={`h-full rounded-full ${free === 0 ? "bg-bad" : free <= 3 ? "bg-warn" : "bg-accent"}`} style={{ width: `${pct}%` }} />
                </div>
              </div>

              <ElectiveButton id={e.id} chosen={e.chosen} disabledReason={reason} title={e.title} />
            </li>
          );
        })}
      </ul>
      <p className="mt-4 text-sm text-muted">
        Места распределяются по мере записи. Если передумаете, откажитесь от дисциплины — место сразу освободится для других.
      </p>
    </div>
  );
}
