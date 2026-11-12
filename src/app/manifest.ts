import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Мой деканат — концепт",
    short_name: "Деканат",
    description: "Концепт личного кабинета студента. Не официальный сервис вуза.",
    start_url: "/",
    display: "standalone",
    background_color: "#e8ebed",
    theme_color: "#244cff",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
