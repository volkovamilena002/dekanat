import { CircleCheck, CircleX, Clock, Hourglass, MessageSquareExclamationPoint, Send } from "lucide-react";
import { STATUS_LABEL, type RequestStatus } from "@/lib/request-types";
import { Chip, type Tone } from "./ui";

export const STATUS_TONE: Record<RequestStatus, Tone> = {
  submitted: "info",
  in_review: "accent",
  needs_info: "warn",
  ready: "ok",
  done: "gray",
  rejected: "bad",
};

export const STATUS_ICON = {
  submitted: Send,
  in_review: Hourglass,
  needs_info: MessageSquareExclamationPoint,
  ready: CircleCheck,
  done: CircleCheck,
  rejected: CircleX,
} as const;

export function RequestStatusChip({ status }: { status: RequestStatus }) {
  return (
    <Chip tone={STATUS_TONE[status]} icon={STATUS_ICON[status] ?? Clock}>
      {STATUS_LABEL[status]}
    </Chip>
  );
}

const STEPS: RequestStatus[] = ["submitted", "in_review", "ready", "done"];

/** Мини-трекер «как у посылки»: 4 точки */
export function RequestProgress({ status }: { status: RequestStatus }) {
  const idx = status === "needs_info" ? 1 : status === "rejected" ? -1 : STEPS.indexOf(status);
  return (
    <div className="flex items-center gap-1" aria-hidden>
      {STEPS.map((s, i) => (
        <span
          key={s}
          className={`h-1.5 flex-1 rounded-full ${
            status === "rejected" ? "bg-bad/30" : i <= idx ? (status === "needs_info" && i === idx ? "bg-warn" : "bg-accent") : "bg-surface-2"
          }`}
        />
      ))}
    </div>
  );
}
