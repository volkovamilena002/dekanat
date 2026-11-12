import type { Metadata } from "next";
import Link from "next/link";
import { Bell, ChevronRight, Info, KeyRound, LogOut, ShieldCheck } from "lucide-react";
import { ThemeSwitcher } from "@/components/theme-toggle";
import { PageHeader } from "@/components/ui";
import { getThemePref } from "@/lib/theme";
import { getProfile } from "@/lib/dal/student";
import { logout } from "@/app/login/actions";

export const metadata: Metadata = { title: "Профиль" };

export default async function ProfilePage() {
  const [p, theme] = await Promise.all([getProfile(), getThemePref()]);
  const rows: [string, string][] = [
    ["Факультет", p.faculty],
    ["Направление", `${p.programCode} ${p.program}`],
    ["Курс", `${p.course}`],
    ["Группа", p.groupName],
    ["Форма обучения", p.studyForm],
    ["Основа обучения", p.funding],
    ["Зачётная книжка", p.recordBook],
    ["Год поступления", `${p.admissionYear}`],
  ];

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <PageHeader title="Профиль" />

      <section className="card flex items-center gap-4 p-5">
        <span className="grid size-16 shrink-0 place-items-center rounded-2xl bg-accent text-xl font-bold text-on-accent">
          {p.firstName[0]}
          {p.lastName[0]}
        </span>
        <div className="min-w-0">
          <p className="text-lg leading-tight font-bold">
            {p.lastName} {p.firstName} {p.middleName}
          </p>
          <p className="mt-0.5 text-sm text-muted">
            Студент · {p.groupName} · {p.course} курс
          </p>
          <p className="mt-0.5 truncate text-sm text-muted">{p.email}</p>
        </div>
      </section>

      <section className="card" aria-labelledby="study-info">
        <h2 id="study-info" className="px-5 pt-4 font-semibold">
          Учебные данные
        </h2>
        <dl className="divide-y divide-line">
          {rows.map(([k, v]) => (
            <div key={k} className="flex justify-between gap-4 px-5 py-3 text-sm">
              <dt className="text-muted">{k}</dt>
              <dd className="text-right font-medium">{v}</dd>
            </div>
          ))}
        </dl>
        <p className="px-5 pb-4 text-xs text-muted">Нашли ошибку в данных? Закажите исправление через раздел «Заявки».</p>
      </section>

      <section className="card p-5" aria-labelledby="appearance">
        <h2 id="appearance" className="mb-3 font-semibold">
          Оформление
        </h2>
        <ThemeSwitcher initial={theme} />
      </section>

      <section className="card divide-y divide-line">
        <Link href="/notifications" className="flex items-center gap-3 px-5 py-4 hover:bg-surface-2/60">
          <Bell className="size-5 text-muted" />
          <span className="flex-1 text-sm font-medium">Уведомления</span>
          <ChevronRight className="size-5 text-muted" />
        </Link>
        <div className="flex items-start gap-3 px-5 py-4">
          <ShieldCheck className="size-5 shrink-0 text-ok" />
          <div className="text-sm">
            <p className="font-medium">Ваши данные под защитой</p>
            <p className="mt-0.5 text-muted">
              Вы видите только свои оценки и заявки. Пароль хранится в виде хеша argon2id, сессия — в защищённой cookie, которую не читает JavaScript.
            </p>
          </div>
        </div>
        <div className="flex items-start gap-3 px-5 py-4">
          <KeyRound className="size-5 shrink-0 text-muted" />
          <div className="text-sm">
            <p className="font-medium">Логин: {p.login}</p>
            <p className="mt-0.5 text-muted">Смена пароля в концепте отключена — это демо-аккаунт.</p>
          </div>
        </div>
        <div className="flex items-start gap-3 px-5 py-4">
          <Info className="size-5 shrink-0 text-muted" />
          <p className="text-sm text-muted">
            «Мой деканат» — концепт для конкурса «Цифровой деканат будущего». Не официальный сервис вуза, все данные вымышленные.
          </p>
        </div>
      </section>

      <form action={logout}>
        <button className="btn btn-secondary w-full text-bad">
          <LogOut className="size-4" /> Выйти
        </button>
      </form>
    </div>
  );
}
