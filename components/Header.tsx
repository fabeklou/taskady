"use client";

import { useRouter } from "next/navigation";

export default function Header({ username }: { username: string }) {
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/me", { method: "DELETE" });
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-20 bg-forest text-paper">
      <div className="mx-auto flex w-full max-w-xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <span
            aria-hidden
            className="grid h-9 w-9 place-items-center rounded-2xl bg-lime text-xl font-bold text-forest"
          >
            T
          </span>
          <div className="leading-tight">
            <p className="text-lg font-bold tracking-tight">taskady</p>
            <p className="text-xs text-paper/70">Made to move. Meant to last.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="max-w-24 truncate rounded-full bg-paper/15 px-3 py-1 text-xs font-semibold">
            {username}
          </span>
          <button
            onClick={logout}
            className="btn-smooth tap-target rounded-full bg-lime px-4 text-sm font-bold text-forest active:scale-95"
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}
