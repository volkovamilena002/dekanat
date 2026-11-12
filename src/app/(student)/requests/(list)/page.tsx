import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, FileText, Plus } from "lucide-react";
import { RequestIcon } from "@/components/request-icon";
import { RequestProgress, RequestStatusChip } from "@/components/request-status";
import { EmptyState, PageHeader, SectionTitle } from "@/components/ui";
import { ACTIVE_STATUSES, listRequests } from "@/lib/dal/student";
import { requestTypeByKey } from "@/lib/request-types";
import { formatDateTime } from "@/lib/time";

export const metadata: Metadata = { title: "Заявки и справки" };

export default async function RequestsPage() {
  const requests = await listRequests();
  const active = requests.filter((r) => ACTIVE_STATUSES.includes(r.status));
  const archive = requests.filter((r) => !ACTIVE_STATUSES.includes(r.status));

  const newButton = (
    <Link href="/requests/new" className="btn btn-primary">
      <Plus className="size-4" /> Новая заявка
    </Link>
  );

  return (
    <div className="space-y-8">
      <PageHeader title="Заявки и справки" subtitle="Заказывайте документы онлайн и следите за статусом — без очереди в деканат" action={newButton} />

      {requests.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={FileText}
            title="Заявок пока нет"
            text="Справка об обучении обычно готова за 1 рабочий день. Закажите её прямо сейчас."
            action={newButton}
          />
        </div>
      ) : (
        <>
          <section aria-labelledby="active-title">
            <SectionTitle>
              <span id="active-title">Активные</span>
            </SectionTitle>
            {active.length ? <RequestList items={active} /> : <p className="text-sm text-muted">Активных заявок нет.</p>}
          </section>
          {archive.length > 0 && (
            <section aria-labelledby="archive-title">
              <SectionTitle>
                <span id="archive-title">Архив</span>
              </SectionTitle>
              <RequestList items={archive} />
            </section>
          )}
        </>
      )}
    </div>
  );
}

function RequestList({ items }: { items: Awaited<ReturnType<typeof listRequests>> }) {
  return (
    <ul className="card divide-y divide-line">
      {items.map((r) => {
        const type = requestTypeByKey(r.type);
        return (
          <li key={r.id}>
            <Link href={`/requests/${r.id}`} className="flex items-center gap-3 p-4 hover:bg-surface-2/60 sm:gap-4">
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent-ink">
                <RequestIcon type={type} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="font-semibold">{type?.title ?? r.type}</span>
                  <RequestStatusChip status={r.status} />
                </span>
                <span className="mt-0.5 block text-xs text-muted">
                  {r.number} · обновлено {formatDateTime(r.updatedAt)}
                </span>
                <span className="mt-2 block max-w-xs">
                  <RequestProgress status={r.status} />
                </span>
              </span>
              <ChevronRight className="size-5 shrink-0 text-muted" aria-hidden />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
