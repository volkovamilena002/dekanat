import type { Metadata } from "next";
import { Chip, PageHeader } from "@/components/ui";
import { listGroups, recentAnnouncements } from "@/lib/dal/staff";
import { formatDateTime } from "@/lib/time";
import { AnnounceForm } from "./announce-form";

export const metadata: Metadata = { title: "Объявления" };

export default async function AnnouncePage() {
  const [groups, recent] = await Promise.all([listGroups(), recentAnnouncements()]);
  return (
    <div>
      <PageHeader title="Объявления" subtitle="Опубликуйте новость или дедлайн — студенты увидят его в ленте уведомлений" />
      <div className="grid gap-6 lg:grid-cols-5">
        <section className="card p-5 lg:col-span-3">
          <AnnounceForm groups={groups} />
        </section>
        <section className="lg:col-span-2">
          <h2 className="mb-3 font-semibold">Недавние</h2>
          <ul className="card divide-y divide-line">
            {recent.map((n) => (
              <li key={n.id} className="p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Chip tone={n.category === "deadline" ? "warn" : "info"}>{n.category === "deadline" ? "Дедлайн" : "Новость"}</Chip>
                  <span className="text-xs text-muted">{n.groupName ? `группа ${n.groupName}` : "всем"}</span>
                </div>
                <p className="mt-1 text-sm font-semibold">{n.title}</p>
                <p className="text-xs text-muted">{formatDateTime(n.createdAt)}</p>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
