"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/staff", label: "Заявки студентов" },
  { href: "/staff/schedule", label: "Расписание" },
  { href: "/staff/announce", label: "Объявления" },
];

export function StaffTabs() {
  const pathname = usePathname();
  return (
    <nav aria-label="Разделы" className="mx-auto max-w-6xl overflow-x-auto px-4 sm:px-6">
      <ul className="flex gap-1">
        {TABS.map((t) => {
          const active = t.href === "/staff" ? pathname === "/staff" || pathname.startsWith("/staff/requests") : pathname.startsWith(t.href);
          return (
            <li key={t.href}>
              <Link
                href={t.href}
                aria-current={active ? "page" : undefined}
                className={`inline-flex h-11 items-center border-b-2 px-3 text-sm font-medium whitespace-nowrap ${
                  active ? "border-accent-ink text-accent-ink" : "border-transparent text-muted hover:text-ink"
                }`}
              >
                {t.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
