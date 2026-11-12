import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Cache Components выключены сознательно: почти все страницы кабинета
  // персональные (читают сессию), классический динамический рендеринг проще
  // и надёжнее для прототипа. См. docs/architecture.md.
  // Для Docker собираем автономный сервер (.next/standalone). Локально на Windows не включаем:
  // standalone требует прав на символические ссылки.
  output: process.env.NEXT_OUTPUT === "standalone" ? "standalone" : undefined,
  serverExternalPackages: ["@node-rs/argon2"],
  poweredByHeader: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
