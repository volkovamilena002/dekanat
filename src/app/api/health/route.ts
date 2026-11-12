import { sql } from "drizzle-orm";
import { db } from "@/db";

// Проверка, что сайт и база живы: GET /api/health → {"ok":true}
export async function GET() {
  try {
    await db.execute(sql`select 1`);
    return Response.json({ ok: true, time: new Date().toISOString() }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ ok: false }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
