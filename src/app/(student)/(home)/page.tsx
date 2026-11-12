import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CalendarClock, CalendarDays, Coffee, FilePlus, MapPin, PartyPopper, UserRound } from "lucide-react";
import { Countdown } from "@/components/countdown";
import { ChangeChip, isChanged, isHeld, LESSON_TYPE, LessonRow } from "@/components/lesson";
import { RequestProgress, RequestStatusChip } from "@/components/request-status";
import { Chip, EmptyState, MoreLink, SectionTitle } from "@/components/ui";
import { ElectivesTeaser } from "@/components/electives-teaser";
import { ACTIVE_STATUSES, getElectives, getGrades, getLessons, getProfile, listNotifications, listRequests, type Lesson } from "@/lib/dal/student";
import { analyzeCourse } from "@/lib/grades";
import { requestTypeByKey } from "@/lib/request-types";
import { addDays, daysBetween, dateMsk, formatDayLong, minutesNowMsk, PAIRS, plural, relativeDay, todayMsk, toMinutes } from "@/lib/time";

export const metadata: Metadata = { title: "Сегодня" };

function greeting(min: number) {
  if (min < 5 * 60) return "Доброй ночи";
  if (min < 12 * 60) return "Доброе утро";
  if (min < 18 * 60) return "Добрый день";
  return "Добрый вечер";
}

export default async function TodayPage() {
  const today = todayMsk();
  const now = minutesNowMsk();
  const [profile, lessons, notifications, requests, grades, electives] = await Promise.all([
    getProfile(),
    getLessons(today, addDays(today, 7)),
    listNotifications(),
    listRequests(),
    getGrades(),
    getElectives(),
  ]);

  const todays = lessons.filter((l) => l.date === today);
  const held = todays.filter(isHeld);
  const current = held.find((l) => toMinutes(PAIRS[l.pair].start) <= now && now < toMinutes(PAIRS[l.pair].end));
  const next = held.find((l) => toMinutes(PAIRS[l.pair].start) > now);
  const upcoming = lessons.find((l) => l.date > today && isHeld(l));

  const changes = lessons.filter((l) => isChanged(l) && (l.date > today || (l.date === today && toMinutes(PAIRS[l.pair].end) > now))).slice(0, 4);

  const nowTs = new Date();
  const deadlines = notifications
    .filter((n) => n.dueAt && n.dueAt > nowTs)
    .sort((a, b) => a.dueAt!.getTime() - b.dueAt!.getTime())
    .slice(0, 3);

  const active = requests.filter((r) => ACTIVE_STATUSES.includes(r.status)).slice(0, 3);
  const current_ = grades.courses.filter((c) => c.semester === grades.currentSemester).map((c) => ({ ...c, a: analyzeCourse(c, today) }));
  const risky = current_.filter((c) => c.a.light === "red" || c.a.light === "yellow");

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted first-letter:uppercase">{formatDayLong(today)}</p>
        <h1 className="text-2xl font-bold tracking-tight sm:text-[28px]">
          {greeting(now)}, {profile.firstName}!
        </h1>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Главная карточка: что сейчас */}
        <HeroCard current={current} next={next} upcoming={upcoming} now={now} today={today} hasToday={todays.length > 0} />

        {/* Изменения */}
        <section className="card p-4 sm:p-5" aria-labelledby="changes-title">
          <SectionTitle action={<MoreLink href="/schedule">Неделя</MoreLink>}>
            <span id="changes-title">Изменения в расписании</span>
          </SectionTitle>
          {changes.length ? (
            <ul className="space-y-3">
              {changes.map((l) => (
                <li key={l.id}>
                  <Link href={`/schedule?date=${l.date}`} className="block rounded-xl p-2 -m-2 hover:bg-surface-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-medium text-muted first-letter:uppercase">
                        {relativeDay(l.date, today)}, {l.pair} пара
                      </span>
                      <ChangeChip lesson={l} />
                    </div>
                    <p className="mt-0.5 truncate text-sm font-semibold">{l.subject}</p>
                    {l.changeNote && <p className="text-sm text-muted">{l.changeNote}</p>}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">На ближайшую неделю изменений нет — всё по плану.</p>
          )}
        </section>
      </div>

      {/* На компьютере: слева пары, под ними «учёба» и «заявки»; справа — элективы и дедлайны.
          На телефоне — пары, элективы, дедлайны, учёба, заявки. */}
      <div className="grid gap-4 lg:grid-cols-3 lg:items-start">
        {/* Пары сегодня */}
        <section className="lg:col-span-2 lg:row-start-1" aria-labelledby="today-title">
          <SectionTitle action={<MoreLink href="/schedule">Всё расписание</MoreLink>}>
            <span id="today-title">Пары сегодня</span>
          </SectionTitle>
          {todays.length ? (
            <ul className="space-y-2.5">
              {todays.map((l) => (
                <LessonRow key={l.id} lesson={l} now={l.id === current?.id} />
              ))}
            </ul>
          ) : (
            <div className="card">
              <EmptyState icon={Coffee} title="Сегодня пар нет" text="Хороший день, чтобы закрыть хвосты или отдохнуть." />
            </div>
          )}
        </section>

        <div className="space-y-4 lg:col-start-3 lg:row-span-2 lg:row-start-1">
          <ElectivesTeaser data={electives} hideWhenDone />

          {/* Дедлайны */}
          <section className="card p-4 sm:p-5" aria-labelledby="dl-title">
            <SectionTitle action={<MoreLink href="/notifications?tab=deadline">Все</MoreLink>}>
              <span id="dl-title">Ближайшие дедлайны</span>
            </SectionTitle>
            {deadlines.length ? (
              <ul className="space-y-3">
                {deadlines.map((d) => {
                  const days = daysBetween(today, dateMsk(d.dueAt!));
                  return (
                    <li key={d.id} className="flex items-start gap-3">
                      <span
                        className={`grid size-11 shrink-0 place-items-center rounded-xl text-center leading-none ${
                          days <= 3 ? "bg-bad-soft text-bad" : days <= 7 ? "bg-warn-soft text-warn" : "bg-surface-2 text-muted"
                        }`}
                      >
                        <span>
                          <span className="block text-base font-bold">{days}</span>
                          <span className="block text-[10px]">{plural(days, ["день", "дня", "дней"])}</span>
                        </span>
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm leading-snug font-semibold">{d.title}</span>
                        <span className="block text-xs text-muted">до {relativeDay(dateMsk(d.dueAt!), today)}</span>
                      </span>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-sm text-muted">Горящих дедлайнов нет.</p>
            )}
          </section>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 sm:items-start lg:col-span-2 lg:row-start-2">
          {/* Учёба */}
          <section className="card p-4 sm:p-5" aria-labelledby="study-title">
            <SectionTitle action={<MoreLink href="/grades">Подробнее</MoreLink>}>
              <span id="study-title">Как дела с учёбой</span>
            </SectionTitle>
            {risky.length ? (
              <ul className="space-y-2">
                {risky.slice(0, 3).map((c) => (
                  <li key={c.id} className="flex items-center justify-between gap-3 text-sm">
                    <span className="min-w-0 truncate">{c.subject}</span>
                    <Chip tone={c.a.light === "red" ? "bad" : "warn"}>{c.a.overdue.length ? "долг" : `${Math.round((c.a.ratio ?? 0) * 100)}%`}</Chip>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-xl bg-ok-soft text-ok">
                  <PartyPopper className="size-5" />
                </span>
                <p className="text-sm">Все дисциплины в зелёной зоне. Так держать!</p>
              </div>
            )}
          </section>

          {/* Заявки */}
          <section className="card p-4 sm:p-5" aria-labelledby="req-title">
            <SectionTitle action={<MoreLink href="/requests">Все</MoreLink>}>
              <span id="req-title">Мои заявки</span>
            </SectionTitle>
            {active.length ? (
              <ul className="space-y-3">
                {active.map((r) => (
                  <li key={r.id}>
                    <Link href={`/requests/${r.id}`} className="-m-2 block rounded-xl p-2 hover:bg-surface-2">
                      <div className="mb-1.5 flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-semibold">{requestTypeByKey(r.type)?.title}</span>
                        <RequestStatusChip status={r.status} />
                      </div>
                      <RequestProgress status={r.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted">Активных заявок нет.</p>
            )}
            <Link href="/requests/new" className="btn btn-secondary mt-4 w-full">
              <FilePlus className="size-4" /> Заказать справку
            </Link>
          </section>
        </div>
      </div>
    </div>
  );
}

function HeroCard({
  current,
  next,
  upcoming,
  now,
  today,
  hasToday,
}: {
  current?: Lesson;
  next?: Lesson;
  upcoming?: Lesson;
  now: number;
  today: string;
  hasToday: boolean;
}) {
  const lesson = current ?? next;
  if (!lesson) {
    return (
      <section className="card flex flex-col justify-between gap-4 bg-linear-to-br from-accent-soft to-surface p-5 lg:col-span-2">
        <div className="flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-2xl bg-accent text-on-accent">
            <CalendarDays className="size-6" />
          </span>
          <div>
            <p className="font-semibold">{hasToday ? "На сегодня пары закончились" : "Сегодня пар нет"}</p>
            <p className="text-sm text-muted">Можно выдохнуть</p>
          </div>
        </div>
        {upcoming && (
          <Link href={`/schedule?date=${upcoming.date}`} className="flex items-center justify-between gap-3 rounded-xl bg-surface p-3.5 hover:ring-1 hover:ring-accent-ink">
            <span className="min-w-0">
              <span className="block text-xs text-muted first-letter:uppercase">
                Следующая: {relativeDay(upcoming.date, today)}, {PAIRS[upcoming.pair].start}
              </span>
              <span className="block truncate font-semibold">{upcoming.subject}</span>
            </span>
            <span className="shrink-0 text-sm font-semibold text-accent-ink">{upcoming.room}</span>
          </Link>
        )}
      </section>
    );
  }

  const isNow = lesson === current;
  const t = PAIRS[lesson.pair];
  return (
    <section
      className="relative overflow-hidden rounded-2xl bg-linear-to-br from-(--hero-from) to-(--hero-to) p-5 text-white shadow-card sm:p-6 lg:col-span-2"
      aria-label={isNow ? "Текущая пара" : "Следующая пара"}
    >
      <div className="absolute -top-16 -right-16 size-56 rounded-full bg-white/10" aria-hidden />
      <div className="relative">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-semibold">
            {isNow ? "Сейчас идёт" : "Следующая пара"}
          </span>
          <span className="text-sm text-white/80">
            {isNow ? (
              <Countdown target={toMinutes(t.end)} initialNow={now} mode="left" />
            ) : (
              <Countdown target={toMinutes(t.start)} initialNow={now} mode="until" />
            )}
          </span>
        </div>
        <p className="mt-3 text-sm text-white/80">
          {LESSON_TYPE[lesson.type]} · {t.start}–{t.end}
        </p>
        <h2 className="mt-0.5 text-xl leading-snug font-bold sm:text-2xl">{lesson.subject}</h2>
        <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2">
          <span className="inline-flex items-center gap-2">
            <MapPin className="size-5 opacity-80" aria-hidden />
            <span className="text-2xl font-bold tracking-tight">{lesson.room}</span>
          </span>
          <span className="inline-flex items-center gap-2 text-sm text-white/90">
            <UserRound className="size-4 opacity-80" aria-hidden />
            {lesson.teacher}
          </span>
        </div>
        {lesson.changeNote && (
          <p className="mt-4 inline-flex items-center gap-2 rounded-xl bg-white/15 px-3 py-2 text-sm">
            <CalendarClock className="size-4" aria-hidden />
            {lesson.changeNote}
          </p>
        )}
        <Link href="/schedule" className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-white hover:underline">
          Расписание на неделю <ArrowRight className="size-4" />
        </Link>
      </div>
    </section>
  );
}

