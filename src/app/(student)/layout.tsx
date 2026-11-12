import Link from "next/link";
import { Bell } from "lucide-react";
import { BottomNav, SideNav } from "@/components/student-nav";
import { ConceptBanner, Logo, SkipLink } from "@/components/ui";
import { ThemeSwitcher, ThemeToggleButton } from "@/components/theme-toggle";
import { getProfile, unreadCount } from "@/lib/dal/student";
import { getThemePref } from "@/lib/theme";

export default async function StudentLayout({ children }: LayoutProps<"/">) {
  const [profile, unread, theme] = await Promise.all([getProfile(), unreadCount(), getThemePref()]);
  const initials = `${profile.firstName[0]}${profile.lastName[0]}`;

  return (
    <div className="min-h-dvh">
      <SkipLink />
      <ConceptBanner />
      <div className="mx-auto flex max-w-7xl">
        {/* Боковая панель — планшет и компьютер */}
        <aside className="sticky top-0 hidden h-dvh print:hidden w-64 shrink-0 flex-col border-r border-line px-4 py-6 lg:flex">
          <Link href="/" className="mb-8 px-2">
            <Logo />
          </Link>
          <SideNav unread={unread} />
          <div className="mt-auto mb-3 px-1">
            <ThemeSwitcher initial={theme} compact />
          </div>
          <Link href="/profile" className="flex items-center gap-3 rounded-xl p-2 hover:bg-surface-2">
            <span className="grid size-10 place-items-center rounded-full bg-accent text-sm font-bold text-on-accent">{initials}</span>
            <span className="min-w-0 leading-tight">
              <span className="block truncate text-sm font-semibold">
                {profile.firstName} {profile.lastName}
              </span>
              <span className="block truncate text-xs text-muted">
                {profile.groupName} · {profile.course} курс
              </span>
            </span>
          </Link>
        </aside>

        <div className="min-w-0 flex-1">
          {/* Верхняя панель — телефон */}
          <header className="sticky top-0 z-20 flex h-14 print:hidden items-center justify-between border-b border-line bg-bg/90 px-4 backdrop-blur lg:hidden">
            <Link href="/" aria-label="На главную">
              <Logo />
            </Link>
            <div className="flex items-center">
              <ThemeToggleButton />
              <Link
                href="/notifications"
                className="relative grid size-11 place-items-center rounded-full text-ink hover:bg-surface-2"
                aria-label={unread ? `Уведомления: ${unread} непрочитанных` : "Уведомления"}
              >
                <Bell className="size-[22px]" />
                {unread > 0 && (
                  <span className="absolute top-1.5 right-1.5 min-w-[18px] rounded-full bg-bad px-1 text-center text-[11px] leading-[18px] font-bold text-white">
                    {unread}
                  </span>
                )}
              </Link>
            </div>
          </header>
          <main id="content" tabIndex={-1} className="px-4 pt-5 outline-none pb-28 sm:px-6 lg:px-10 lg:pt-8 lg:pb-12 print:p-0">{children}</main>
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
