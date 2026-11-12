import Link from "next/link";
import { SearchX } from "lucide-react";
import { EmptyState } from "@/components/ui";

export default function NotFound() {
  return (
    <div className="card">
      <EmptyState
        icon={SearchX}
        title="Не найдено"
        text="Такой страницы нет, или у вас нет к ней доступа."
        action={
          <Link href="/" className="btn btn-primary">
            На главную
          </Link>
        }
      />
    </div>
  );
}
