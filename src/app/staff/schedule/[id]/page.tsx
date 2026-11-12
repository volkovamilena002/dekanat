import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, CalendarX2 } from "lucide-react";
import { LessonRow } from "@/components/lesson";
import { EmptyState } from "@/components/ui";
import { freeRooms, getLessonForStaff, isEditable, listGroupsWithSize, listTeachers } from "@/lib/dal/staff";
import { formatDayLong, plural, todayMsk } from "@/lib/time";
import { changeLessonAction } from "../../actions";
import { LessonForm } from "./lesson-form";

export const metadata: Metadata = { title: "Изменить пару" };

export default async function StaffLessonPage({ params }: PageProps<"/staff/schedule/[id]">) {
  const { id } = await params;
  const lesson = await getLessonForStaff(id);
  const today = todayMsk();
  const back = `/staff/schedule?group=${lesson.groupId}&date=${lesson.date}`;
  const [teachers, rooms, groups] = await Promise.all([listTeachers(), freeRooms(lesson.date, lesson.pair), listGroupsWithSize()]);
  const size = groups.find((g) => g.id === lesson.groupId)?.size ?? 0;

  return (
    <div className="mx-auto max-w-2xl">
      <Link href={back} className="mb-3 inline-flex items-center gap-1 text-sm font-medium text-muted hover:text-ink">
        <ArrowLeft className="size-4" aria-hidden /> Расписание {lesson.groupName}
      </Link>
      <h1 className="text-2xl font-bold tracking-tight">Изменить пару</h1>
      <p className="mt-1 mb-4 text-sm text-muted first-letter:uppercase">
        {formatDayLong(lesson.date)} · группа {lesson.groupName}
      </p>

      <ul className="mb-5">
        <LessonRow lesson={lesson} />
      </ul>

      {isEditable(lesson, today) ? (
        <section className="card p-4 sm:p-5">
          <LessonForm
            action={changeLessonAction.bind(null, lesson.id)}
            today={today}
            currentRoom={lesson.room}
            freeRooms={rooms}
            teachers={teachers.filter((t) => t.id !== lesson.teacherId)}
            audience={`${size} ${plural(size, ["студент", "студента", "студентов"])} группы ${lesson.groupName}`}
          />
        </section>
      ) : (
        <div className="card">
          <EmptyState
            icon={CalendarX2}
            title="Эту пару изменить нельзя"
            text="Она уже прошла, отменена или перенесена. Изменения вносятся только в будущие пары."
            action={
              <Link href={back} className="btn btn-secondary">
                К расписанию
              </Link>
            }
          />
        </div>
      )}
    </div>
  );
}
