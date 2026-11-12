import { getLessons } from "@/lib/dal/student";
import { LESSON_TYPE, isHeld } from "@/components/lesson";
import { addDays, PAIRS, todayMsk } from "@/lib/time";

// Экспорт расписания текущего студента в iCalendar (.ics) на 8 недель вперёд.
// Москва — UTC+3 без перехода на летнее время, поэтому переводим в UTC вычитанием 3 часов.

function utcStamp(date: string, hhmm: string) {
  const d = new Date(`${date}T${hhmm}:00+03:00`);
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

const esc = (s: string) => s.replace(/[\\;,]/g, (m) => `\\${m}`).replace(/\n/g, "\\n");

export async function GET() {
  const today = todayMsk();
  const lessons = (await getLessons(today, addDays(today, 56))).filter(isHeld);
  const stamp = utcStamp(today, "00:00");
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Moi dekanat (concept)//RU",
    "CALSCALE:GREGORIAN",
    "X-WR-CALNAME:Расписание (концепт)",
    ...lessons.flatMap((l) => [
      "BEGIN:VEVENT",
      `UID:${l.id}@dekanat.concept`,
      `DTSTAMP:${stamp}`,
      `DTSTART:${utcStamp(l.date, PAIRS[l.pair].start)}`,
      `DTEND:${utcStamp(l.date, PAIRS[l.pair].end)}`,
      `SUMMARY:${esc(`${l.subject} (${LESSON_TYPE[l.type].toLowerCase()})`)}`,
      `LOCATION:${esc(l.room)}`,
      `DESCRIPTION:${esc(l.teacher + (l.changeNote ? `\n${l.changeNote}` : ""))}`,
      "END:VEVENT",
    ]),
    "END:VCALENDAR",
  ];
  return new Response(lines.join("\r\n"), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="raspisanie.ics"',
      "Cache-Control": "private, no-store",
    },
  });
}
