import type { Metadata } from "next";
import { connection } from "next/server";
import { CalendarDays, FileText, GraduationCap, Bell } from "lucide-react";
import { ThemeToggleButton } from "@/components/theme-toggle";
import { ConceptBanner, Logo } from "@/components/ui";
import { LoginForm, type DemoAccount } from "./login-form";

// Тестовые аккаунты для жюри — намеренно публичные (их пароли и так отправляются с работой).
// Это не ключи сервисов. Подсказку можно отключить: SHOW_DEMO_ACCOUNTS=0.
const DEMO: DemoAccount[] = [
  { login: "maria", password: "maria2026", who: "Мария Лебедева", what: "ИВТ-31, 3 курс · отличница, бюджет" },
  { login: "daniil", password: "daniil2026", who: "Даниил Орлов", what: "ИВТ-31, 3 курс · риск по «Сетям»" },
  { login: "artem", password: "artem2026", who: "Артём Соколов", what: "ЭК-11, 1 курс · контракт, долг по матанализу" },
  { login: "dekanat", password: "dekanat2026", who: "Ольга Петрова", what: "Сотрудник деканата" },
];

export const metadata: Metadata = { title: "Вход" };

const FEATURES = [
  { icon: CalendarDays, text: "Расписание с переносами и заменами — сразу видно, что изменилось" },
  { icon: GraduationCap, text: "Баллы, прогноз оценки и риск долга по каждой дисциплине" },
  { icon: FileText, text: "Справки без очереди: статус заявки как трекинг посылки" },
  { icon: Bell, text: "Объявления и дедлайны деканата в одной ленте" },
];

export default async function LoginPage() {
  await connection();
  return (
    <div className="flex min-h-dvh flex-col">
      <ConceptBanner />
      <div className="grid flex-1 grid-cols-1 lg:grid-cols-2">
        <aside className="relative hidden overflow-hidden bg-linear-to-br from-(--hero-from) to-(--hero-to) p-12 lg:flex lg:flex-col lg:justify-between">
          <div className="absolute -top-24 -right-24 size-96 rounded-full bg-white/10" aria-hidden />
          <div className="absolute -bottom-32 -left-16 size-80 rounded-full bg-white/5" aria-hidden />
          <div className="relative text-white">
            <p className="text-sm font-semibold tracking-wide uppercase opacity-80">Энский государственный университет</p>
            <h1 className="mt-4 max-w-md text-4xl leading-tight font-bold">Всё про учёбу — в одном месте и в пару касаний</h1>
          </div>
          <ul className="relative space-y-4 text-white">
            {FEATURES.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-start gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-white/15">
                  <Icon className="size-5" aria-hidden />
                </span>
                <span className="pt-1.5 text-[15px] opacity-95">{text}</span>
              </li>
            ))}
          </ul>
        </aside>

        <main className="relative flex items-center justify-center px-4 py-10 sm:px-8">
          <ThemeToggleButton className="absolute top-3 right-3" />
          <div className="w-full max-w-sm">
            <Logo />
            <h2 className="mt-8 text-2xl font-bold tracking-tight">Вход в кабинет</h2>
            <p className="mt-1 mb-6 text-sm text-muted">Используйте логин и пароль студента или сотрудника.</p>
            <LoginForm demo={process.env.SHOW_DEMO_ACCOUNTS === "0" ? [] : DEMO} />
          </div>
        </main>
      </div>
    </div>
  );
}
