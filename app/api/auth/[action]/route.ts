import { NextResponse } from "next/server";
import {
  hashPassword,
  sessionCookieHeader,
  signSession,
  verifyPassword,
} from "@/lib/auth";
import { createUser, findUserByUsername } from "@/lib/store";
import { loginSchema, signupSchema } from "@/lib/validations";

function publicUser(id: string, username: string) {
  return { id, username };
}

export async function POST(req: Request) {
  const url = new URL(req.url);
  const mode = url.pathname.endsWith("/login") ? "login" : "signup";
  if (mode !== "login" && mode !== "signup") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed =
    mode === "login" ? loginSchema.safeParse(body) : signupSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const username = parsed.data.username.trim();

  if (mode === "signup") {
    if (await findUserByUsername(username)) {
      return NextResponse.json(
        { error: "Username is already taken" },
        { status: 409 }
      );
    }
    const user = await createUser(username, await hashPassword(parsed.data.password));
    const token = await signSession(user.id);
    const res = NextResponse.json(
      { user: publicUser(user.id, user.username) },
      { status: 201 }
    );
    res.headers.set("Set-Cookie", sessionCookieHeader(token));
    return res;
  }

  const existing = await findUserByUsername(username);
  if (!existing) {
    return NextResponse.json(
      { error: "Invalid username or password" },
      { status: 401 }
    );
  }
  const ok = await verifyPassword(parsed.data.password, existing.passwordHash);
  if (!ok) {
    return NextResponse.json(
      { error: "Invalid username or password" },
      { status: 401 }
    );
  }
  const token = await signSession(existing.id);
  const res = NextResponse.json({
    user: publicUser(existing.id, existing.username),
  });
  res.headers.set("Set-Cookie", sessionCookieHeader(token));
  return res;
}
