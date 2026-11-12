import type { Metadata } from "next";
import Link from "next/link";
import { BadgeCheck, CircleX, Search } from "lucide-react";
import { ConceptBanner, Logo } from "@/components/ui";
import { verifyDocument } from "@/lib/dal/public";
import { formatDateTime } from "@/lib/time";

export const metadata: Metadata = { title: "Проверка документа" };

export default async function VerifyPage({ searchParams }: PageProps<"/verify">) {
  const sp = await searchParams;
  const code = typeof sp.code === "string" ? sp.code.slice(0, 32) : "";
  const result = code ? await verifyDocument(code) : null;

  return (
    <div className="flex min-h-dvh flex-col">
      <ConceptBanner />
      <main className="mx-auto w-full max-w-md flex-1 px-4 py-10">
        <Link href="/login">
          <Logo />
        </Link>
        <h1 className="mt-8 text-2xl font-bold tracking-tight">Проверка подлинности справки</h1>
        <p className="mt-1 text-sm text-muted">Введите код с документа — например, работодатель или соцслужба могут проверить справку без звонка в деканат.</p>

        <form className="mt-6 flex gap-2" action="/verify">
          <label htmlFor="code" className="sr-only">
            Код проверки
          </label>
          <input
            id="code"
            name="code"
            defaultValue={code}
            className="input font-mono tracking-widest uppercase"
            placeholder="A1B2C3D4E5"
            autoComplete="off"
            maxLength={10}
          />
          <button className="btn btn-primary shrink-0" aria-label="Проверить">
            <Search className="size-4" />
          </button>
        </form>

        {code &&
          (result ? (
            <div className="card mt-6 p-5">
              <p className="flex items-center gap-2 font-semibold text-ok">
                <BadgeCheck className="size-5" /> Документ действителен
              </p>
              <dl className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-muted">Документ</dt>
                  <dd className="text-right font-medium">{result.title}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted">Номер</dt>
                  <dd className="font-medium">{result.number}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted">Выдан</dt>
                  <dd className="font-medium">{formatDateTime(result.issuedAt)}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted">Обучающийся</dt>
                  <dd className="font-medium">{result.holder}</dd>
                </div>
              </dl>
            </div>
          ) : (
            <div className="mt-6 flex items-start gap-3 rounded-2xl bg-bad-soft p-4 text-bad">
              <CircleX className="mt-0.5 size-5 shrink-0" />
              <p className="text-sm font-medium">Документ с таким кодом не найден. Проверьте код или обратитесь в деканат.</p>
            </div>
          ))}
      </main>
    </div>
  );
}
