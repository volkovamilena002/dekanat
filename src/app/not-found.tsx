import Link from "next/link";
import { SearchX } from "lucide-react";
import { ConceptBanner, EmptyState } from "@/components/ui";

export default function NotFound() {
  return (
    <div className="min-h-dvh">
      <ConceptBanner />
      <main className="mx-auto max-w-md px-4 py-16">
        <div className="card">
          <EmptyState
            icon={SearchX}
            title="Страница не найдена"
            text="Такой страницы нет, или у вас нет к ней доступа."
            action={
              <Link href="/" className="btn btn-primary">
                На главную
              </Link>
            }
          />
        </div>
      </main>
    </div>
  );
}
