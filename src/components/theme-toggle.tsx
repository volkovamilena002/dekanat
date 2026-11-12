"use client";

import { useEffect, useState } from "react";
import { Monitor, Moon, Sun, type LucideIcon } from "lucide-react";

export type ThemePref = "light" | "dark" | "system";

const COLORS = { light: "#e8ebed", dark: "#17191d" } as const;
const EVENT = "dk-themechange";

function resolved(): "light" | "dark" {
  const t = document.documentElement.dataset.theme;
  if (t === "light" || t === "dark") return t;
  return matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function apply(pref: ThemePref) {
  const root = document.documentElement;
  if (pref === "system") delete root.dataset.theme;
  else root.dataset.theme = pref;
  document.cookie = `theme=${pref}; path=/; max-age=31536000; samesite=lax`;
  // Цвет строки состояния браузера на телефоне
  document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]').forEach((m) => {
    const system = matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    const forMedia = m.media ? (m.media.includes("dark") ? "dark" : "light") : system;
    m.content = COLORS[pref === "system" ? forMedia : pref];
  });
  window.dispatchEvent(new CustomEvent<ThemePref>(EVENT, { detail: pref }));
}

const OPTIONS: { value: ThemePref; label: string; icon: LucideIcon }[] = [
  { value: "light", label: "Светлая", icon: Sun },
  { value: "dark", label: "Тёмная", icon: Moon },
  { value: "system", label: "Как в системе", icon: Monitor },
];

/** Три варианта: светлая / тёмная / как в системе. compact — только иконки. */
export function ThemeSwitcher({ initial, compact = false }: { initial: ThemePref; compact?: boolean }) {
  const [pref, setPref] = useState<ThemePref>(initial);
  // Несколько переключателей на странице (меню и профиль) держим в согласии
  useEffect(() => {
    const on = (e: Event) => setPref((e as CustomEvent<ThemePref>).detail);
    window.addEventListener(EVENT, on);
    return () => window.removeEventListener(EVENT, on);
  }, []);

  return (
    <div role="radiogroup" aria-label="Тема оформления" className={`inline-flex rounded-xl bg-surface-2 p-1 ${compact ? "" : "w-full sm:w-auto"}`}>
      {OPTIONS.map(({ value, label, icon: Icon }) => {
        const active = pref === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={compact ? `Тема: ${label.toLowerCase()}` : undefined}
            title={compact ? label : undefined}
            onClick={() => {
              setPref(value);
              apply(value);
            }}
            className={`inline-flex min-h-9 flex-1 items-center justify-center gap-1.5 rounded-lg px-2.5 text-sm font-medium transition-colors ${
              active ? "bg-surface text-ink shadow-card" : "text-muted hover:text-ink"
            }`}
          >
            <Icon className="size-4 shrink-0" aria-hidden />
            {!compact && label}
          </button>
        );
      })}
    </div>
  );
}

/** Одна кнопка для шапки: переключает светлую ↔ тёмную. Иконка выбирается CSS, без мигания. */
export function ThemeToggleButton({ className = "" }: { className?: string }) {
  return (
    <button
      type="button"
      onClick={() => apply(resolved() === "dark" ? "light" : "dark")}
      className={`grid size-11 place-items-center rounded-full text-ink hover:bg-surface-2 ${className}`}
    >
      <Moon className="size-5 dark:hidden" aria-hidden />
      <Sun className="hidden size-5 dark:block" aria-hidden />
      <span className="sr-only dark:hidden">Включить тёмную тему</span>
      <span className="sr-only hidden dark:inline">Включить светлую тему</span>
    </button>
  );
}
