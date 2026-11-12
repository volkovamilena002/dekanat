import type { Metadata, Viewport } from "next";
import "@fontsource-variable/onest";
import "./globals.css";
import { getThemePref, THEME_COLORS } from "@/lib/theme";

export const metadata: Metadata = {
  title: { default: "Мой деканат — концепт", template: "%s · Мой деканат" },
  description:
    "Концепт личного кабинета студента «Цифровой деканат будущего». Прототип для конкурса, не официальный сервис вуза. Все данные вымышленные.",
  robots: { index: false, follow: false },
  applicationName: "Мой деканат",
  appleWebApp: { capable: true, title: "Мой деканат", statusBarStyle: "default" },
};

// Цвет строки состояния браузера на телефоне — под выбранную тему
export async function generateViewport(): Promise<Viewport> {
  const theme = await getThemePref();
  return {
    width: "device-width",
    initialScale: 1,
    viewportFit: "cover",
    themeColor:
      theme === "system"
        ? [
            { media: "(prefers-color-scheme: light)", color: THEME_COLORS.light },
            { media: "(prefers-color-scheme: dark)", color: THEME_COLORS.dark },
          ]
        : THEME_COLORS[theme],
  };
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // Выбранная тема приходит из cookie — сервер сразу рисует страницу в нужной теме
  const theme = await getThemePref();
  return (
    <html lang="ru" className="h-full antialiased" data-theme={theme === "system" ? undefined : theme}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
