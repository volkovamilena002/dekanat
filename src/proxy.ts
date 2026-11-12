import { NextResponse, type NextRequest } from "next/server";

// Оптимистичная проверка: без cookie сессии сразу отправляем на вход.
// Настоящая проверка (сессия в БД, роль, владелец данных) — в Data Access Layer.
const PUBLIC = ["/login", "/verify", "/about", "/api/health", "/robots.txt"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isPublic = PUBLIC.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  if (!isPublic && !request.cookies.has("dk_session")) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg|manifest.webmanifest|.*\\.(?:png|svg|ico|webp)$).*)"],
};
