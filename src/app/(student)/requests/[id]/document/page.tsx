import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PrintButton } from "@/components/print-button";
import { getGrades, getProfile, getRequest } from "@/lib/dal/student";
import { CONTROL_LABEL } from "@/lib/grades";
import { requestTypeByKey } from "@/lib/request-types";
import { dateMsk, formatDay } from "@/lib/time";

export const metadata: Metadata = { title: "Документ" };

export default async function DocumentPage({ params }: PageProps<"/requests/[id]/document">) {
  const { id } = await params;
  const req = await getRequest(id); // проверка владельца
  const type = requestTypeByKey(req.type);
  if (!type || type.group !== "certificate" || (req.status !== "ready" && req.status !== "done") || !req.verifyCode) notFound();
  const p = await getProfile();
  const grades = req.type === "transcript" ? await getGrades() : null;
  const issued = dateMsk(req.updatedAt);
  const fio = `${p.lastName} ${p.firstName} ${p.middleName ?? ""}`.trim();

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-4 flex items-center justify-between print:hidden">
        <Link href={`/requests/${req.id}`} className="inline-flex items-center gap-1 text-sm font-medium text-muted hover:text-ink">
          <ArrowLeft className="size-4" /> К заявке
        </Link>
        <PrintButton />
      </div>

      <article className="relative overflow-hidden rounded-2xl border border-line bg-white p-6 text-[#151826] shadow-card sm:p-10 print:border-0 print:shadow-none">
        <div className="pointer-events-none absolute inset-0 grid place-items-center" aria-hidden>
          <span className="-rotate-30 text-6xl font-black tracking-widest text-[#244cff]/7 sm:text-8xl">КОНЦЕПТ</span>
        </div>
        <header className="relative border-b border-[#e3e5ef] pb-5 text-center">
          <p className="text-xs tracking-wide text-[#596069] uppercase">Министерство науки и высшего образования (пример)</p>
          <p className="mt-1 font-bold">Энский государственный университет</p>
          <p className="text-sm text-[#596069]">{p.faculty}</p>
        </header>

        <h1 className="relative mt-6 text-center text-xl font-bold tracking-wide uppercase">{type.title}</h1>
        <p className="relative mt-1 text-center text-sm text-[#596069]">
          № {req.number} от {formatDay(issued)} {issued.slice(0, 4)} г.
        </p>

        <div className="relative mt-6 space-y-3 leading-relaxed">
          {req.type === "transcript" ? (
            <>
              <p>
                Выписка оценок обучающегося <b>{fio}</b>, группа {p.groupName}, направление {p.programCode} «{p.program}», номер зачётной книжки{" "}
                {p.recordBook}.
              </p>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#e3e5ef] text-left text-[#596069]">
                    <th className="py-1.5 font-medium">Сем.</th>
                    <th className="py-1.5 font-medium">Дисциплина</th>
                    <th className="py-1.5 font-medium">Форма</th>
                    <th className="py-1.5 text-right font-medium">Оценка</th>
                  </tr>
                </thead>
                <tbody>
                  {grades!.courses
                    .filter((c) => c.finalMark)
                    .sort((a, b) => a.semester - b.semester)
                    .map((c) => (
                      <tr key={c.id} className="border-b border-[#f0f1f8]">
                        <td className="py-1.5">{c.semester}</td>
                        <td className="py-1.5">{c.subject}</td>
                        <td className="py-1.5">{CONTROL_LABEL[c.controlType]}</td>
                        <td className="py-1.5 text-right font-medium">{c.finalMark}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </>
          ) : req.type === "income_certificate" ? (
            <p>
              Дана <b>{fio}</b>, обучающемуся(-ейся) группы {p.groupName}, в том, что за период с {req.payload.from} по {req.payload.to}{" "}
              {p.funding === "бюджет" ? "ему(ей) выплачивалась государственная академическая стипендия в размере 3 500 руб. в месяц." : "стипендиальные выплаты не производились."}
            </p>
          ) : (
            <p>
              Дана <b>{fio}</b> в том, что он(а) действительно обучается в Энском государственном университете на {p.course} курсе по направлению{" "}
              {p.programCode} «{p.program}», {p.studyForm} форма обучения, {p.funding === "бюджет" ? "на бюджетной основе" : "на договорной основе"},
              группа {p.groupName}. Год поступления — {p.admissionYear}.
            </p>
          )}
          {req.payload.purpose && <p>Справка выдана для предоставления: {req.payload.purpose.toLowerCase()}.</p>}
        </div>

        <footer className="relative mt-10 flex flex-wrap items-end justify-between gap-4 border-t border-[#e3e5ef] pt-5 text-sm">
          <div>
            <p className="text-[#596069]">Специалист деканата</p>
            <p className="font-medium">О. В. Петрова</p>
          </div>
          <div className="rounded-xl border border-dashed border-[#244cff]/40 px-4 py-2 text-right">
            <p className="text-xs text-[#596069]">Код проверки подлинности</p>
            <p className="font-mono text-lg font-bold tracking-widest text-[#244cff]">{req.verifyCode}</p>
            <p className="text-xs text-[#596069]">проверить: /verify</p>
          </div>
        </footer>
        <p className="relative mt-6 text-center text-[11px] text-[#596069]">
          Документ сформирован в прототипе «Мой деканат» для конкурса. Не является официальным документом. Данные вымышленные.
        </p>
      </article>
    </div>
  );
}
