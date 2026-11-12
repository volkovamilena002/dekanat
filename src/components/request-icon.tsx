import { FileText, HandCoins, IdCard, List, Pause, Shield, Wallet } from "lucide-react";
import type { RequestType } from "@/lib/request-types";

const ICONS = {
  "file-text": FileText,
  shield: Shield,
  wallet: Wallet,
  "hand-coins": HandCoins,
  pause: Pause,
  "id-card": IdCard,
  list: List,
} as const;

export function RequestIcon({ type, className = "size-5" }: { type?: RequestType; className?: string }) {
  const Icon = type ? ICONS[type.icon] : FileText;
  return <Icon className={className} aria-hidden />;
}
