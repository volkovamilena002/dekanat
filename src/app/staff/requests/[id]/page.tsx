import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { RequestIcon } from "@/components/request-icon";
import { RequestStatusChip } from "@/components/request-status";
import { getRequestForStaff, TRANSITIONS } from "@/lib/dal/staff";
import { requestTypeByKey, STATUS_LABEL } from "@/lib/request-types";
import { formatDateTime } from "@/lib/time";
import { changeStatusAction } from "../../actions";
import { StatusForm } from "./status-form";

export const metadata: Metadata = { title: "Заявка" };

export default async function StaffRequestPage({ params }: PageProps<"/staff/requests/[id]">) {
  const { id } = await params;
  const { request: r, student, group, events } = await getRequestForStaff(id);
  const type = requestTypeByKey(r.type);

  return (
    <div className="mx-auto max-w-4xl">
      <Link href="/staff" className="mb-3 inline-flex items-center gap-1 text-sm font-medium text-muted hover:text-ink">
        <ArrowLeft className="size-4" /> Все заявки
      </Link>
      <div className="mb-6 flex items-start gap-4">
        <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-accent-soft text-accent-ink">
          <RequestIcon type={type} className="size-6" />
        </span>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{type?.title}</h1>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted">
            {r.number} · подана {formatDateTime(r.createdAt)} <RequestStatusChip status={r.status} />
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <section className="card p-5">
          <h2 className="mb-3 font-semibold">Студент</h2>
          <dl className="space-y-2 text-sm">
            <Row k="ФИО" v={`${student.lastName} ${student.firstName} ${student.middleName ?? ""}`} />
            <Row k="Группа" v={`${group.name}, ${group.course} курс`} />
            <Row k="Факультет" v={group.faculty} />
            <Row k="Зачётная книжка" v={student.recordBook} />
            <Row k="Основа" v={student.funding} />
          </dl>
          <h2 className="mt-5 mb-3 font-semibold">Параметры заявки</h2>
          <dl className="space-y-2 text-sm">
            {type?.fields.map((f) => (r.payload[f.name] ? <Row key={f.name} k={f.label} v={r.payload[f.name]} /> : null))}
          </dl>
        </section>

        <div className="space-y-4">
          <section className="card p-5">
            <h2 className="mb-3 font-semibold">Действие</h2>
            <StatusForm allowed={TRANSITIONS[r.status]} action={changeStatusAction.bind(null, r.id)} />
          </section>
          <section className="card p-5">
            <h2 className="mb-3 font-semibold">История</h2>
            <ol className="space-y-3 text-sm">
              {events.map((e) => (
                <li key={e.id}>
                  <p className="font-medium">
                    {STATUS_LABEL[e.status]} <span className="font-normal text-muted">· {formatDateTime(e.createdAt)}</span>
                  </p>
                  {e.comment && <p className="text-muted">{e.comment}</p>}
                </li>
              ))}
            </ol>
          </section>
        </div>
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted">{k}</dt>
      <dd className="text-right font-medium">{v}</dd>
    </div>
  );
}
