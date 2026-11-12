import Link from "next/link";
import { ChevronRight, CircleCheck, ListChecks } from "lucide-react";
import type { ElectivesData } from "@/lib/dal/student";
import { dateMsk, daysBetween, plural, todayMsk } from "@/lib/time";

/** Плашка-вход в запись на элективы. Ничего не рисует, если записи нет. */
export function ElectivesTeaser({ data, hideWhenDone = false }: { data: ElectivesData | null; hideWhenDone?: boolean }) {
  if (!data || !data.electives.length) return null;
  const { round, chosenCount } = data;
  const done = chosenCount >= round.pick;
  if (hideWhenDone && (done || !round.open)) return null;
  const left = daysBetween(todayMsk(), dateMsk(round.closesAt));

  return (
    <Link
      href="/grades/electives"
      className={`card flex items-center gap-3 p-4 transition-colors hover:border-accent-ink ${done ? "" : "border-accent-ink bg-accent-soft/40"}`}
    >
      <div className={`grid size-11 shrink-0 place-items-center rounded-2xl ${done ? "bg-ok-soft text-ok" : "bg-accent text-on-accent"}`}>
        {done ? <CircleCheck className="size-6" aria-hidden /> : <ListChecks className="size-6" aria-hidden />}
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-semibold">Дисциплины по выбору</p>
        <p className="text-sm text-muted">
          {!round.open
            ? `Запись закрыта · выбрано ${chosenCount} из ${round.pick}`
            : done
              ? `Выбор сделан · изменить можно ещё ${left} ${plural(left, ["день", "дня", "дней"])}`
              : `Выбрано ${chosenCount} из ${round.pick} · ${left <= 0 ? "запись закрывается сегодня" : `осталось ${left} ${plural(left, ["день", "дня", "дней"])}`}`}
        </p>
      </div>
      <ChevronRight className="size-5 shrink-0 text-muted" aria-hidden />
    </Link>
  );
}
