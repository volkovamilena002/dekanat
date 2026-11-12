import type { Metadata } from "next";
import { Award, CalendarClock, ChevronDown, CircleCheck, CircleExclamationPoint, GraduationCap, TrendingUp } from "lucide-react";
import { Chip, EmptyState, PageHeader, SectionTitle, type Tone } from "@/components/ui";
import { ElectivesTeaser } from "@/components/electives-teaser";
import { getElectives, getGrades, getProfile, type Course } from "@/lib/dal/student";
import { analyzeCourse, CONTROL_LABEL, gpa, MARK_LABEL, type Light } from "@/lib/grades";
import { daysBetween, formatDay, plural, relativeDay, todayMsk, weekdayShort } from "@/lib/time";

export const metadata: Metadata = { title: "Успеваемость" };

const LIGHT: Record<Light, { tone: Tone; label: string; bar: string }> = {
  green: { tone: "ok", label: "Всё хорошо", bar: "bg-ok" },
  yellow: { tone: "warn", label: "Есть риск", bar: "bg-warn" },
  red: { tone: "bad", label: "Риск долга", bar: "bg-bad" },
  gray: { tone: "gray", label: "Нет оценок", bar: "bg-muted" },
};

export default async function GradesPage() {
  const today = todayMsk();
  const [{ currentSemester, courses }, profile, electives] = await Promise.all([getGrades(), getProfile(), getElectives()]);
  const order: Record<Light, number> = { red: 0, yellow: 1, green: 2, gray: 3 };
  const current = courses
    .filter((c) => c.semester === currentSemester)
    .map((c) => ({ ...c, a: analyzeCourse(c, today) }))
    .sort((x, y) => order[x.a.light] - order[y.a.light]);
  const past = courses.filter((c) => c.semester < currentSemester);
  const semesters = [...new Set(past.map((c) => c.semester))].sort((a, b) => b - a);

  const avg = gpa(past.map((c) => c.finalMark));
  const green = current.filter((c) => c.a.light === "green").length;
  const debts = current.filter((c) => c.a.overdue.length > 0);
  const session = current.filter((c) => c.examDate && c.examDate >= today).sort((a, b) => a.examDate!.localeCompare(b.examDate!));
  const firstExam = session.find((c) => c.controlType === "exam");
  const forecastThrees = current.filter((c) => c.a.predictedMark === "3" || c.a.predictedMark === "2" || c.a.predictedMark === "не зачтено");

  return (
    <div className="space-y-8">
      <PageHeader title="Успеваемость" subtitle={`${currentSemester} семестр · ${profile.groupName} · балльно-рейтинговая система, 100 баллов на дисциплину`} />

      {/* Сводка */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat icon={Award} label="Средний балл" value={avg ? avg.toFixed(2).replace(".", ",") : "—"} hint={avg ? "за прошлые сессии" : "первая сессия впереди"} />
        <Stat
          icon={CircleCheck}
          label="В зелёной зоне"
          value={`${green} из ${current.length}`}
          hint={debts.length ? `${debts.length} ${plural(debts.length, ["долг", "долга", "долгов"])} по КТ` : "долгов нет"}
          tone={debts.length ? "bad" : "ok"}
        />
        <Stat
          icon={CalendarClock}
          label="До первого экзамена"
          value={firstExam ? `${daysBetween(today, firstExam.examDate!)} ${plural(daysBetween(today, firstExam.examDate!), ["день", "дня", "дней"])}` : "—"}
          hint={firstExam ? firstExam.subject : "экзаменов нет"}
        />
        <Stat
          icon={TrendingUp}
          label="Стипендия"
          value={profile.funding === "бюджет" ? (forecastThrees.length ? "Под угрозой" : "Сохраняется") : "—"}
          hint={profile.funding === "бюджет" ? (forecastThrees.length ? `прогноз «3» по ${forecastThrees.length} дисц.` : "если сдать без троек") : "обучение по договору"}
          tone={profile.funding === "бюджет" ? (forecastThrees.length ? "warn" : "ok") : undefined}
        />
      </div>

      <ElectivesTeaser data={electives} />

      {/* Текущий семестр */}
      <section aria-labelledby="cur-title">
        <SectionTitle>
          <span id="cur-title">Дисциплины семестра</span>
        </SectionTitle>
        {current.length ? (
          <ul className="grid gap-3 md:grid-cols-2">
            {current.map((c) => (
              <CourseCard key={c.id} course={c} />
            ))}
          </ul>
        ) : (
          <div className="card">
            <EmptyState icon={GraduationCap} title="Дисциплин пока нет" text="Они появятся, когда деканат сформирует учебный план семестра." />
          </div>
        )}
      </section>

      {/* Сессия */}
      <section aria-labelledby="session-title">
        <SectionTitle>
          <span id="session-title">Зачётная неделя и сессия</span>
        </SectionTitle>
        {session.length ? (
          <ol className="card divide-y divide-line">
            {session.map((c) => (
              <li key={c.id} className="flex items-center gap-4 p-4">
                <div className="w-14 shrink-0 text-center">
                  <p className="text-xl leading-none font-bold">{Number(c.examDate!.slice(8))}</p>
                  <p className="text-xs text-muted">{formatDay(c.examDate!).split(" ")[1].slice(0, 3)}, {weekdayShort(c.examDate!)}</p>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{c.subject}</p>
                  <p className="text-sm text-muted">
                    {CONTROL_LABEL[c.controlType]} · {c.examTime} · ауд. {c.examRoom}
                  </p>
                </div>
                <span className="hidden text-sm text-muted sm:block">{relativeDay(c.examDate!, today)}</span>
                {c.controlType === "exam" && (
                  <Chip tone={c.a.semesterEarned >= c.a.admissionThreshold ? "ok" : "warn"}>
                    {c.a.semesterEarned >= c.a.admissionThreshold ? "допуск есть" : `до допуска ${c.a.admissionThreshold - c.a.semesterEarned} б.`}
                  </Chip>
                )}
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-sm text-muted">Сессия пока не запланирована.</p>
        )}
      </section>

      {/* История */}
      <section aria-labelledby="hist-title">
        <SectionTitle>
          <span id="hist-title">Прошлые семестры</span>
        </SectionTitle>
        {semesters.length ? (
          <div className="space-y-2">
            {semesters.map((s) => {
              const list = past.filter((c) => c.semester === s);
              const g = gpa(list.map((c) => c.finalMark));
              return (
                <details key={s} className="card group">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4">
                    <span className="font-semibold">{s} семестр</span>
                    <span className="flex items-center gap-3 text-sm text-muted">
                      {g && <span>средний {g.toFixed(2).replace(".", ",")}</span>}
                      <ChevronDown className="size-5 transition-transform group-open:rotate-180" aria-hidden />
                    </span>
                  </summary>
                  <ul className="divide-y divide-line border-t border-line">
                    {list.map((c) => (
                      <li key={c.id} className="flex items-center justify-between gap-3 px-4 py-3">
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium">{c.subject}</span>
                          <span className="block text-xs text-muted">
                            {CONTROL_LABEL[c.controlType]} · {c.credits} з.е.
                          </span>
                        </span>
                        <MarkBadge mark={c.finalMark} />
                      </li>
                    ))}
                  </ul>
                </details>
              );
            })}
          </div>
        ) : (
          <div className="card">
            <EmptyState icon={GraduationCap} title="Это ваш первый семестр" text="После первой сессии здесь появятся итоговые оценки." />
          </div>
        )}
      </section>
    </div>
  );
}

function Stat({ icon: Icon, label, value, hint, tone }: { icon: typeof Award; label: string; value: string; hint: string; tone?: Tone }) {
  const color = tone === "bad" ? "text-bad" : tone === "warn" ? "text-warn" : tone === "ok" ? "text-ok" : "";
  return (
    <div className="card p-4">
      <div className="flex items-center gap-2 text-muted">
        <Icon className="size-4" aria-hidden />
        <span className="text-xs font-medium">{label}</span>
      </div>
      <p className={`mt-2 text-xl font-bold tracking-tight sm:text-2xl ${color}`}>{value}</p>
      <p className="mt-0.5 truncate text-xs text-muted">{hint}</p>
    </div>
  );
}

function MarkBadge({ mark }: { mark: string | null }) {
  if (!mark) return <Chip>нет</Chip>;
  const tone: Tone = mark === "5" || mark === "зачтено" ? "ok" : mark === "4" ? "info" : mark === "3" ? "warn" : "bad";
  return (
    <Chip tone={tone}>
      {/^\d$/.test(mark) ? `${mark} · ${MARK_LABEL[mark]}` : mark}
    </Chip>
  );
}

function CourseCard({ course: c }: { course: Course & { a: ReturnType<typeof analyzeCourse> } }) {
  const l = LIGHT[c.a.light];
  const possiblePct = Math.min(100, c.a.possible);
  return (
    <li className="card p-4">
      <details className="group">
        <summary className="cursor-pointer list-none">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="leading-snug font-semibold">{c.subject}</p>
              <p className="mt-0.5 text-xs text-muted">
                {CONTROL_LABEL[c.controlType]} · {c.credits} з.е. · {c.teacher}
              </p>
            </div>
            <Chip tone={l.tone}>{l.label}</Chip>
          </div>

          <div className="mt-4 flex items-end justify-between gap-3">
            <p>
              <span className="text-2xl font-bold">{c.a.earned}</span>
              <span className="text-sm text-muted"> / 100 баллов</span>
            </p>
            {c.a.predictedMark && (
              <p className="text-right text-xs text-muted">
                прогноз
                <span className="block text-sm font-semibold text-ink">
                  {/^\d$/.test(c.a.predictedMark) ? `${c.a.predictedMark} (${MARK_LABEL[c.a.predictedMark]})` : c.a.predictedMark}
                </span>
              </p>
            )}
          </div>
          {/* Полоса: набрано / можно было набрать к сегодняшнему дню / максимум */}
          <div className="relative mt-2 h-2.5 overflow-hidden rounded-full bg-surface-2" role="img" aria-label={`Набрано ${c.a.earned} из ${c.a.possible} возможных на сегодня`}>
            <div className="absolute inset-y-0 left-0 bg-line" style={{ width: `${possiblePct}%` }} />
            <div className={`absolute inset-y-0 left-0 rounded-full ${l.bar}`} style={{ width: `${Math.min(100, c.a.earned)}%` }} />
          </div>
          <p className="mt-1.5 text-xs text-muted">
            {c.a.possible ? `из ${c.a.possible} возможных на сегодня` : "оценок пока нет"}
          </p>

          {c.a.overdue.length > 0 && (
            <p className="mt-3 flex items-start gap-2 rounded-xl bg-bad-soft px-3 py-2 text-sm text-bad">
              <CircleExclamationPoint className="mt-0.5 size-4 shrink-0" aria-hidden />
              Не сдано: {c.a.overdue.map((i) => i.title).join(", ")}. Договоритесь с преподавателем о пересдаче.
            </p>
          )}
          {!c.a.overdue.length && c.a.nextItem && (
            <p className="mt-3 text-sm text-muted">
              Дальше: <span className="font-medium text-ink">{c.a.nextItem.title}</span> — {relativeDay(c.a.nextItem.dueDate!)}, до {c.a.nextItem.maxScore} баллов
            </p>
          )}
          <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-accent-ink">
            <span className="group-open:hidden">Показать баллы</span>
            <span className="hidden group-open:inline">Скрыть</span>
            <ChevronDown className="size-4 transition-transform group-open:rotate-180" aria-hidden />
          </span>
        </summary>
        <ul className="mt-3 divide-y divide-line border-t border-line">
          {c.items.map((i) => (
            <li key={i.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
              <span className="min-w-0">
                <span className="block truncate">{i.title}</span>
                {i.dueDate && <span className="block text-xs text-muted">{formatDay(i.dueDate)}</span>}
              </span>
              <span className="shrink-0 font-semibold tabular-nums">
                {i.score === null ? (
                  i.dueDate && i.dueDate < todayMsk() ? (
                    <span className="text-bad">не сдано</span>
                  ) : (
                    <span className="font-normal text-muted">— / {i.maxScore}</span>
                  )
                ) : (
                  <>
                    {i.score} <span className="font-normal text-muted">/ {i.maxScore}</span>
                  </>
                )}
              </span>
            </li>
          ))}
        </ul>
      </details>
    </li>
  );
}
