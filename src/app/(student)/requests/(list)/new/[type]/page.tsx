import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Clock, Info } from "lucide-react";
import { RequestIcon } from "@/components/request-icon";
import { getProfile } from "@/lib/dal/student";
import { requestTypeByKey } from "@/lib/request-types";
import { plural } from "@/lib/time";
import { submitRequest } from "../../../actions";
import { RequestForm } from "./request-form";

export async function generateMetadata({ params }: PageProps<"/requests/new/[type]">): Promise<Metadata> {
  const { type } = await params;
  return { title: requestTypeByKey(type)?.title ?? "Заявка" };
}

export default async function NewRequestTypePage({ params }: PageProps<"/requests/new/[type]">) {
  const { type: key } = await params;
  const type = requestTypeByKey(key);
  if (!type) notFound();
  const profile = await getProfile();

  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/requests/new" className="mb-3 inline-flex items-center gap-1 text-sm font-medium text-muted hover:text-ink">
        <ArrowLeft className="size-4" /> Все документы
      </Link>
      <div className="mb-6 flex items-start gap-4">
        <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-accent-soft text-accent-ink">
          <RequestIcon type={type} className="size-6" />
        </span>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{type.title}</h1>
          <p className="mt-1 text-sm text-muted">{type.short}</p>
          <p className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium">
            <Clock className="size-4 text-muted" aria-hidden />
            Срок: {type.days} {plural(type.days, ["рабочий день", "рабочих дня", "рабочих дней"])}
          </p>
        </div>
      </div>

      <div className="card mb-4 flex gap-3 p-4 text-sm">
        <Info className="mt-0.5 size-4 shrink-0 text-info" aria-hidden />
        <p>
          Данные подставятся автоматически: <b>{profile.lastName} {profile.firstName} {profile.middleName}</b>, {profile.groupName},{" "}
          {profile.course} курс, {profile.studyForm} форма, {profile.funding}.
        </p>
      </div>

      <div className="card p-4 sm:p-6">
        <RequestForm fields={type.fields} action={submitRequest.bind(null, type.key)} defaults={{ copies: "1" }} />
      </div>
    </div>
  );
}
