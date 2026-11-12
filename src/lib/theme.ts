import "server-only";
import { cookies } from "next/headers";

/**
 * Выбор темы хранится в cookie (не в localStorage): сервер сразу ставит data-theme на <html>,
 * поэтому страница не «мигает» другой темой при загрузке. Cookie не секретная и не httpOnly —
 * её пишет переключатель в браузере (src/components/theme-toggle.tsx).
 *
 * По умолчанию (cookie нет) — светлая тема, даже если в системе включена тёмная.
 * «Как в системе» пользователь выбирает сам.
 */
export type ThemePref = "light" | "dark" | "system";
export const THEME_COOKIE = "theme";
export const DEFAULT_THEME: ThemePref = "light";
export const THEME_COLORS = { light: "#e8ebed", dark: "#17191d" } as const;

export async function getThemePref(): Promise<ThemePref> {
  const v = (await cookies()).get(THEME_COOKIE)?.value;
  return v === "light" || v === "dark" || v === "system" ? v : DEFAULT_THEME;
}
