"use client";

import { RotateCcw, TriangleExclamationPoint } from "lucide-react";
import { EmptyState } from "@/components/ui";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="card">
      <EmptyState
        icon={TriangleExclamationPoint}
        title="Что-то пошло не так"
        text="Мы уже знаем о проблеме. Попробуйте обновить страницу — данные не потерялись."
        action={
          <button onClick={reset} className="btn btn-primary">
            <RotateCcw className="size-4" /> Повторить
          </button>
        }
      />
    </div>
  );
}
