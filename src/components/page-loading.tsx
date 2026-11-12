import { PageSkeleton } from "./ui";

/** Скелетон страницы. Подключается через loading.tsx в разделах без id в адресе. */
export default function PageLoading() {
  return <PageSkeleton />;
}
