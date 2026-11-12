CREATE TABLE "elective_choices" (
	"student_id" uuid NOT NULL,
	"elective_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "elective_choices_student_id_elective_id_pk" PRIMARY KEY("student_id","elective_id")
);
--> statement-breakpoint
CREATE TABLE "elective_rounds" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"course" integer NOT NULL,
	"semester" integer NOT NULL,
	"title" text NOT NULL,
	"pick" integer DEFAULT 2 NOT NULL,
	"closes_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "electives" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"round_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"teacher_id" uuid NOT NULL,
	"capacity" integer NOT NULL,
	"slot" text NOT NULL,
	"format" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "elective_choices" ADD CONSTRAINT "elective_choices_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "elective_choices" ADD CONSTRAINT "elective_choices_elective_id_electives_id_fk" FOREIGN KEY ("elective_id") REFERENCES "public"."electives"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "electives" ADD CONSTRAINT "electives_round_id_elective_rounds_id_fk" FOREIGN KEY ("round_id") REFERENCES "public"."elective_rounds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "electives" ADD CONSTRAINT "electives_teacher_id_teachers_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."teachers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "elective_choices_elective_idx" ON "elective_choices" USING btree ("elective_id");--> statement-breakpoint
CREATE INDEX "electives_round_idx" ON "electives" USING btree ("round_id");