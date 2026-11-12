import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Clock } from "lucide-react";
import { RequestIcon } from "@/components/request-icon";
import { PageHeader, SectionTitle } from "@/components/ui";
import { REQUEST_TYPES } from "@/lib/request-types";
import { plural } from "@/lib/time";

export const metadata: Metadata = { title: "Новая заявка" };

export default function NewRequestPage() {
  const groups = [
    { key: "certificate", title: "Справки" },
    { key: "statement", title: "Заявления" },
  ] as const;
  return (
    <div>
      <Link href="/requests" className="mb-3 inline-flex items-center gap-1 text-sm font-medium text-muted hover:text-ink">
        <ArrowLeft className="size-4" /> Заявки
      </Link>
      <PageHeader title="Что нужно оформить?" subtitle="Выберите документ — дальше всего пара полей" />
      <div className="space-y-8">
        {groups.map((g) => (
          <section key={g.key} aria-labelledby={`g-${g.key}`}>
            <SectionTitle>
              <span id={`g-${g.key}`}>{g.title}</span>
            </SectionTitle>
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {REQUEST_TYPES.filter((t) => t.group === g.key).map((t) => (
                <li key={t.key}>
                  <Link
                    href={`/requests/new/${t.key}`}
                    className="card flex h-full flex-col p-4 transition-colors hover:border-accent-ink"
                  >
                    <span className="mb-3 grid size-11 place-items-center rounded-xl bg-accent-soft text-accent-ink">
                      <RequestIcon type={t} />
                    </span>
                    <span className="font-semibold">{t.title}</span>
                    <span className="mt-1 flex-1 text-sm text-muted">{t.short}</span>
                    <span className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-muted">
                      <Clock className="size-3.5" aria-hidden />
                      {t.days} {plural(t.days, ["рабочий день", "рабочих дня", "рабочих дней"])}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
