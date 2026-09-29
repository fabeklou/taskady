import { jwtVerify } from "jose";
import { NextResponse, type NextRequest } from "next/server";

const SESSION_COOKIE = "taskady_session";

function secret(): Uint8Array {
  return new TextEncoder().encode(
    process.env.JWT_SECRET || "dev-only-secret-change-me"
  );
}

export async function middleware(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  let userId: string | null = null;
  if (token) {
    try {
      const { payload } = await jwtVerify(token, secret());
      userId = typeof payload.sub === "string" ? payload.sub : null;
    } catch {
      userId = null;
    }
  }

  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/api/")) {
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.next();
  }

  if (!userId && pathname.startsWith("/dashboard")) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (userId && (pathname === "/login" || pathname === "/signup")) {
    const url = req.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/login", "/signup", "/api/tasks/:path*", "/api/categories"],
};
