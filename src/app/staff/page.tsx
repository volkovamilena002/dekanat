import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, Inbox } from "lucide-react";
import { RequestIcon } from "@/components/request-icon";
import { RequestStatusChip } from "@/components/request-status";
import { EmptyState, PageHeader } from "@/components/ui";
import { listAllRequests, requestCounts } from "@/lib/dal/staff";
import { requestTypeByKey, type RequestStatus } from "@/lib/request-types";
import { formatDateTime } from "@/lib/time";

export const metadata: Metadata = { title: "Заявки студентов" };

const FILTERS: { key: string; label: string; statuses?: RequestStatus[] }[] = [
  { key: "new", label: "Новые", statuses: ["submitted"] },
  { key: "work", label: "В работе", statuses: ["in_review", "needs_info"] },
  { key: "ready", label: "Готовы к выдаче", statuses: ["ready"] },
  { key: "closed", label: "Закрытые", statuses: ["done", "rejected"] },
  { key: "all", label: "Все" },
];

export default async function StaffRequestsPage({ searchParams }: PageProps<"/staff">) {
  const { f } = await searchParams;
  const filter = FILTERS.find((x) => x.key === f) ?? FILTERS[0];
  const [items, counts] = await Promise.all([listAllRequests(filter.statuses), requestCounts()]);
  const count = (s?: RequestStatus[]) => (s ? s.reduce((n, k) => n + (counts[k] ?? 0), 0) : Object.values(counts).reduce((a, b) => a + (b ?? 0), 0));

  return (
    <div>
      <PageHeader title="Заявки студентов" subtitle={`Новых: ${counts.submitted ?? 0} · ждут уточнения: ${counts.needs_info ?? 0}`} />
      <nav aria-label="Фильтр" className="-mx-4 mb-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <ul className="flex gap-2">
          {FILTERS.map((x) => (
            <li key={x.key}>
              <Link
                href={`/staff?f=${x.key}`}
                aria-current={x === filter ? "page" : undefined}
                className={`inline-flex min-h-10 items-center gap-1.5 rounded-full border px-4 text-sm font-medium whitespace-nowrap ${
                  x === filter ? "border-accent-ink bg-accent text-on-accent" : "border-line bg-surface hover:border-accent-ink"
                }`}
              >
                {x.label} <span className={x === filter ? "opacity-90" : "text-muted"}>{count(x.statuses)}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {items.length ? (
        <ul className="card divide-y divide-line">
          {items.map((r) => {
            const type = requestTypeByKey(r.type);
            return (
              <li key={r.id}>
                <Link href={`/staff/requests/${r.id}`} className="flex items-center gap-3 p-4 hover:bg-surface-2/60 sm:gap-4">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent-ink">
                    <RequestIcon type={type} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="font-semibold">{type?.title}</span>
                      <RequestStatusChip status={r.status} />
                    </span>
                    <span className="mt-0.5 block text-sm">
                      {r.lastName} {r.firstName} · {r.groupName}
                    </span>
                    <span className="block text-xs text-muted">
                      {r.number} · подана {formatDateTime(r.createdAt)}
                    </span>
                  </span>
                  <ChevronRight className="size-5 shrink-0 text-muted" aria-hidden />
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="card">
          <EmptyState icon={Inbox} title="Очередь пуста" text="В этой категории заявок нет. Можно выпить чаю." />
        </div>
      )}
    </div>
  );
}
