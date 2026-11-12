import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, CircleCheck, Clock, FileCheck2, MapPin, MessageSquareExclamationPoint, PartyPopper } from "lucide-react";
import { RequestIcon } from "@/components/request-icon";
import { RequestStatusChip, STATUS_ICON } from "@/components/request-status";
import { getRequest } from "@/lib/dal/student";
import { requestTypeByKey, STATUS_LABEL, type RequestStatus } from "@/lib/request-types";
import { formatDateTime, plural } from "@/lib/time";
import { answerRequestAction, cancelRequestAction } from "../actions";
import { AnswerForm } from "./answer-form";

export const metadata: Metadata = { title: "Заявка" };

const FLOW: RequestStatus[] = ["submitted", "in_review", "ready", "done"];
const FLOW_HINT: Record<RequestStatus, string> = {
  submitted: "Заявка получена деканатом",
  in_review: "Сотрудник готовит документ",
  needs_info: "Деканату нужна дополнительная информация",
  ready: "Документ готов",
  done: "Документ выдан",
  rejected: "Заявка закрыта",
};

export default async function RequestPage({ params, searchParams }: PageProps<"/requests/[id]">) {
  const { id } = await params;
  const { created } = await searchParams;
  const req = await getRequest(id); // чужая заявка → 404
  const type = requestTypeByKey(req.type);
  const electronic = req.payload.delivery?.startsWith("Электронно");
  const lastIdx = req.status === "needs_info" ? 1 : FLOW.indexOf(req.status);

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/requests" className="mb-3 inline-flex items-center gap-1 text-sm font-medium text-muted hover:text-ink">
        <ArrowLeft className="size-4" /> Заявки
      </Link>

      {created && (
        <div role="status" className="mb-4 flex items-start gap-3 rounded-2xl bg-ok-soft p-4 text-ok">
          <PartyPopper className="mt-0.5 size-5 shrink-0" />
          <div>
            <p className="font-semibold">Заявка отправлена</p>
            <p className="text-sm">
              Обычно это занимает {type?.days} {plural(type?.days ?? 1, ["рабочий день", "рабочих дня", "рабочих дней"])}. Мы пришлём уведомление,
              когда статус изменится.
            </p>
          </div>
        </div>
      )}

      <div className="mb-6 flex items-start gap-4">
        <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-accent-soft text-accent-ink">
          <RequestIcon type={type} className="size-6" />
        </span>
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight">{type?.title ?? req.type}</h1>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted">
            {req.number} · от {formatDateTime(req.createdAt)} <RequestStatusChip status={req.status} />
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-5">
        <div className="space-y-4 md:col-span-3">
          {/* Действие, которое ждут от студента */}
          {req.status === "needs_info" && (
            <section className="rounded-2xl border border-warn/40 bg-warn-soft p-4">
              <p className="flex items-center gap-2 font-semibold text-warn">
                <MessageSquareExclamationPoint className="size-5" /> Деканат просит уточнить
              </p>
              {req.staffComment && <p className="mt-1.5 text-sm">{req.staffComment}</p>}
              <AnswerForm action={answerRequestAction.bind(null, req.id)} />
            </section>
          )}
          {(req.status === "ready" || req.status === "done") && (
            <section className="rounded-2xl border border-ok/30 bg-ok-soft p-4">
              <p className="flex items-center gap-2 font-semibold text-ok">
                <CircleCheck className="size-5" /> {req.status === "ready" ? "Документ готов" : "Документ выдан"}
              </p>
              {req.staffComment && <p className="mt-1.5 text-sm">{req.staffComment}</p>}
              {electronic && type?.group === "certificate" ? (
                <Link href={`/requests/${req.id}/document`} className="btn btn-primary mt-3">
                  <FileCheck2 className="size-4" /> Открыть документ
                </Link>
              ) : (
                <p className="mt-2 inline-flex items-center gap-1.5 text-sm">
                  <MapPin className="size-4" /> Деканат, кабинет 214, пн–пт 10:00–17:00
                </p>
              )}
              {req.verifyCode && (
                <p className="mt-3 text-xs text-muted">
                  Код проверки подлинности: <span className="font-mono font-semibold text-ink">{req.verifyCode}</span>
                </p>
              )}
            </section>
          )}

          {/* Трекер */}
          <section className="card p-4 sm:p-5" aria-labelledby="track-title">
            <h2 id="track-title" className="mb-4 font-semibold">
              Статус заявки
            </h2>
            {req.status !== "rejected" && (
              <ol className="mb-5 grid grid-cols-4 gap-1 text-center text-[11px] sm:text-xs">
                {FLOW.map((s, i) => (
                  <li key={s}>
                    <div className={`mb-1.5 h-1.5 rounded-full ${i <= lastIdx ? (req.status === "needs_info" && i === lastIdx ? "bg-warn" : "bg-accent") : "bg-surface-2"}`} />
                    <span className={i <= lastIdx ? "font-semibold" : "text-muted"}>{STATUS_LABEL[s]}</span>
                  </li>
                ))}
              </ol>
            )}
            <ol className="relative space-y-5 border-l-2 border-line pl-6">
              {[...req.events].reverse().map((e, i) => {
                const Icon = STATUS_ICON[e.status];
                return (
                  <li key={e.id} className="relative">
                    <span
                      className={`absolute top-0 -left-[37px] grid size-7 place-items-center rounded-full ring-4 ring-surface ${
                        i === 0 ? "bg-accent text-on-accent" : "bg-surface-2 text-muted"
                      }`}
                    >
                      <Icon className="size-3.5" />
                    </span>
                    <p className="text-sm font-semibold">{STATUS_LABEL[e.status]}</p>
                    <p className="text-xs text-muted">{formatDateTime(e.createdAt)}</p>
                    <p className="mt-1 text-sm text-muted">{e.comment ?? FLOW_HINT[e.status]}</p>
                  </li>
                );
              })}
            </ol>
          </section>
        </div>

        <aside className="space-y-4 md:col-span-2">
          <section className="card p-4 sm:p-5">
            <h2 className="mb-3 font-semibold">Детали</h2>
            <dl className="space-y-3 text-sm">
              {type?.fields.map((f) =>
                req.payload[f.name] ? (
                  <div key={f.name}>
                    <dt className="text-muted">{f.label}</dt>
                    <dd className="font-medium">{req.payload[f.name]}</dd>
                  </div>
                ) : null,
              )}
              <div>
                <dt className="text-muted">Срок</dt>
                <dd className="inline-flex items-center gap-1.5 font-medium">
                  <Clock className="size-4 text-muted" /> до {type?.days} {plural(type?.days ?? 1, ["рабочего дня", "рабочих дней", "рабочих дней"])}
                </dd>
              </div>
            </dl>
          </section>
          {(req.status === "submitted" || req.status === "needs_info") && (
            <form action={cancelRequestAction.bind(null, req.id)}>
              <button className="btn btn-ghost w-full text-bad">Отменить заявку</button>
            </form>
          )}
        </aside>
      </div>
    </div>
  );
}
