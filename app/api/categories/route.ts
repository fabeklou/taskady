import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth";
import { categoriesForUser } from "@/lib/store";

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ categories: categoriesForUser(userId) });
}
