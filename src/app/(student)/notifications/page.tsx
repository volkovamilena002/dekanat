import type { Metadata } from "next";
import Link from "next/link";
import { BellOff, CalendarClock, CalendarDays, CheckCheck, FileText, GraduationCap, Megaphone } from "lucide-react";
import { Chip, EmptyState, PageHeader } from "@/components/ui";
import { listNotifications, type Notification } from "@/lib/dal/student";
import { daysBetween, dateMsk, formatDateTime, plural, relativeDay, todayMsk } from "@/lib/time";
import { markAllReadAction, openNotificationAction } from "./actions";

export const metadata: Metadata = { title: "Уведомления" };

const TABS = [
  { key: "all", label: "Все" },
  { key: "deadline", label: "Дедлайны" },
  { key: "schedule", label: "Расписание" },
  { key: "request", label: "Заявки" },
  { key: "news", label: "Новости" },
] as const;

const CATEGORY = {
  news: { icon: Megaphone, cls: "bg-info-soft text-info", label: "Новость" },
  deadline: { icon: CalendarClock, cls: "bg-warn-soft text-warn", label: "Дедлайн" },
  schedule: { icon: CalendarDays, cls: "bg-accent-soft text-accent-ink", label: "Расписание" },
  request: { icon: FileText, cls: "bg-ok-soft text-ok", label: "Заявка" },
  grades: { icon: GraduationCap, cls: "bg-accent-soft text-accent-ink", label: "Оценки" },
} as const;

export default async function NotificationsPage({ searchParams }: PageProps<"/notifications">) {
  const { tab: rawTab } = await searchParams;
  const tab = TABS.some((t) => t.key === rawTab) ? (rawTab as (typeof TABS)[number]["key"]) : "all";
  const all = await listNotifications();
  const unread = all.filter((n) => !n.readAt).length;
  const today = todayMsk();
  const now = new Date();

  let items: Notification[] = tab === "all" ? all : all.filter((n) => n.category === tab);
  if (tab === "deadline") {
    // актуальные — по сроку, прошедшие — в конце
    items = [...items].sort((a, b) => {
      const pa = a.dueAt! < now ? 1 : 0;
      const pb = b.dueAt! < now ? 1 : 0;
      return pa - pb || a.dueAt!.getTime() - b.dueAt!.getTime();
    });
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Уведомления"
        subtitle={unread ? `${unread} ${plural(unread, ["непрочитанное", "непрочитанных", "непрочитанных"])}` : "Всё прочитано"}
        action={
          unread > 0 && (
            <form action={markAllReadAction}>
              <button className="btn btn-secondary">
                <CheckCheck className="size-4" /> Прочитать все
              </button>
            </form>
          )
        }
      />

      <nav aria-label="Категории" className="-mx-4 mb-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <ul className="flex gap-2">
          {TABS.map((t) => {
            const count = t.key === "all" ? unread : all.filter((n) => n.category === t.key && !n.readAt).length;
            const active = t.key === tab;
            return (
              <li key={t.key}>
                <Link
                  href={t.key === "all" ? "/notifications" : `/notifications?tab=${t.key}`}
                  aria-current={active ? "page" : undefined}
                  className={`inline-flex min-h-10 items-center gap-1.5 rounded-full border px-4 text-sm font-medium whitespace-nowrap ${
                    active ? "border-accent-ink bg-accent text-on-accent" : "border-line bg-surface text-ink hover:border-accent-ink"
                  }`}
                >
                  {t.label}
                  {count > 0 && <span className={`text-xs ${active ? "opacity-90" : "text-muted"}`}>{count}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {items.length ? (
        <ul className="card divide-y divide-line overflow-hidden">
          {items.map((n) => {
            const c = CATEGORY[n.category];
            const Icon = c.icon;
            const due = n.dueAt ? daysBetween(today, dateMsk(n.dueAt)) : null;
            return (
              <li key={n.id} className={!n.readAt ? "bg-accent-soft/35" : ""}>
                <form action={openNotificationAction.bind(null, n.id, n.link)}>
                  <button className="flex w-full gap-3 p-4 text-left hover:bg-surface-2/60 sm:gap-4">
                    <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${c.cls}`}>
                      <Icon className="size-5" aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        {!n.readAt && <span className="size-2 rounded-full bg-accent" aria-label="Новое" />}
                        <span className="font-semibold">{n.title}</span>
                        {n.important === 1 && <Chip tone="bad">важно</Chip>}
                      </span>
                      <span className="mt-1 block text-sm text-muted">{n.body}</span>
                      <span className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted">
                        <span>{formatDateTime(n.createdAt)}</span>
                        {n.dueAt && due !== null && (
                          <Chip tone={due < 0 ? "gray" : due <= 3 ? "bad" : due <= 7 ? "warn" : "gray"}>
                            {due < 0 ? "срок прошёл" : due === 0 ? "сегодня" : `до ${relativeDay(dateMsk(n.dueAt), today)}`}
                          </Chip>
                        )}
                      </span>
                    </span>
                  </button>
                </form>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="card">
          <EmptyState icon={BellOff} title="Здесь пока пусто" text="Когда деканат что-то опубликует, уведомление появится здесь." />
        </div>
      )}
    </div>
  );
}
