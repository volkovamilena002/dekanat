import Link from "next/link";
import { LogOut } from "lucide-react";
import { ThemeToggleButton } from "@/components/theme-toggle";
import { ConceptBanner, Logo, SkipLink } from "@/components/ui";
import { StaffTabs } from "./staff-tabs";
import { requireStaff } from "@/lib/auth/session";
import { logout } from "@/app/login/actions";

export default async function StaffLayout({ children }: LayoutProps<"/staff">) {
  const me = await requireStaff();
  return (
    <div className="min-h-dvh">
      <SkipLink />
      <ConceptBanner />
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link href="/staff" className="flex items-center gap-3">
            <Logo compact />
            <span className="leading-tight">
              <span className="block text-[15px] font-bold">Деканат</span>
              <span className="block text-[11px] text-muted">кабинет сотрудника</span>
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <span className="hidden text-sm text-muted sm:block">
              {me.lastName} {me.firstName[0]}. {me.middleName?.[0]}.
            </span>
            <ThemeToggleButton />
            <form action={logout}>
              <button className="btn btn-ghost px-3" aria-label="Выйти">
                <LogOut className="size-4" />
                <span className="hidden sm:inline">Выйти</span>
              </button>
            </form>
          </div>
        </div>
        <StaffTabs />
      </header>
      <main id="content" tabIndex={-1} className="mx-auto max-w-6xl outline-none px-4 py-6 sm:px-6 lg:py-8">{children}</main>
    </div>
  );
}
