import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth";
import { filterTasks } from "@/lib/filter";
import { createTaskForUser, listTasksForUser } from "@/lib/store";
import { taskCreateSchema } from "@/lib/validations";

export async function GET(req: Request) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const tasks = filterTasks(await listTasksForUser(userId), {
    q: url.searchParams.get("q") ?? "",
    category: url.searchParams.get("category") ?? "ALL",
    priority: url.searchParams.get("priority") ?? "ALL",
    status: url.searchParams.get("status") ?? "ALL",
  });
  return NextResponse.json({ tasks });
}

export async function POST(req: Request) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = taskCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid task" },
      { status: 400 }
    );
  }

  const task = await createTaskForUser(userId, {
    title: parsed.data.title,
    note: parsed.data.note ?? "",
    priority: parsed.data.priority ?? "MEDIUM",
    category: parsed.data.category || "General",
    dueAt: parsed.data.dueAt ?? null,
    remindBefore: parsed.data.remindBefore ?? "NONE",
  });
  return NextResponse.json({ task }, { status: 201 });
}
