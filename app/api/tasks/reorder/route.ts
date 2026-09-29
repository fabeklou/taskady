import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth";
import { reorderTasksForUser } from "@/lib/store";
import { reorderSchema } from "@/lib/validations";

/** Persist drag-and-drop order. Body: { orderedIds: string[] } (full order). */
export async function POST(req: Request) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = reorderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid order" },
      { status: 400 }
    );
  }
  const ok = await reorderTasksForUser(userId, parsed.data.orderedIds);
  if (!ok) return NextResponse.json({ error: "Task not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
