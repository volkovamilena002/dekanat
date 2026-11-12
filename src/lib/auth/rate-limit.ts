// Ограничение неудачных попыток входа. Хранится в памяти процесса — достаточно для
// одного экземпляра; при горизонтальном масштабировании выносится в Redis/БД.
const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILS = 5;

type Bucket = { fails: number; resetAt: number };
const buckets = new Map<string, Bucket>();

function bucket(key: string) {
  const now = Date.now();
  let b = buckets.get(key);
  if (!b || b.resetAt < now) {
    b = { fails: 0, resetAt: now + WINDOW_MS };
    buckets.set(key, b);
  }
  return b;
}

/** Сколько минут ещё ждать, если ключ заблокирован; 0 — можно пробовать. */
export function lockedMinutes(keys: string[]) {
  const now = Date.now();
  let wait = 0;
  for (const key of keys) {
    const b = bucket(key);
    if (b.fails >= MAX_FAILS) wait = Math.max(wait, Math.ceil((b.resetAt - now) / 60000));
  }
  return wait;
}

export function registerFailure(keys: string[]) {
  for (const key of keys) bucket(key).fails++;
}

export function resetFailures(keys: string[]) {
  for (const key of keys) buckets.delete(key);
}
