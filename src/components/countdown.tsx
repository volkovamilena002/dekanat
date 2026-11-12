"use client";

import { useEffect, useState } from "react";

function mskMinutes() {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Moscow",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());
  const h = Number(parts.find((p) => p.type === "hour")!.value);
  const m = Number(parts.find((p) => p.type === "minute")!.value);
  return h * 60 + m;
}

function fmt(min: number) {
  if (min < 60) return `${min} мин`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} ч ${m} мин` : `${h} ч`;
}

/** «через 25 мин» / «ещё 40 мин» — обновляется раз в 30 секунд */
export function Countdown({ target, initialNow, mode }: { target: number; initialNow: number; mode: "until" | "left" }) {
  const [now, setNow] = useState(initialNow);
  useEffect(() => {
    const id = setInterval(() => setNow(mskMinutes()), 30_000);
    return () => clearInterval(id);
  }, []);
  const diff = Math.max(0, target - now);
  return <>{mode === "until" ? (diff === 0 ? "начинается" : `через ${fmt(diff)}`) : `ещё ${fmt(diff)}`}</>;
}
