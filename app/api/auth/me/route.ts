import { NextResponse } from "next/server";
import { clearedSessionCookieHeader, getSessionUserId } from "@/lib/auth";
import { findUserById } from "@/lib/store";

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ user: null }, { status: 401 });
  const user = findUserById(userId);
  if (!user) return NextResponse.json({ user: null }, { status: 401 });
  return NextResponse.json({ user: { id: user.id, username: user.username } });
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.headers.set("Set-Cookie", clearedSessionCookieHeader());
  return res;
}
