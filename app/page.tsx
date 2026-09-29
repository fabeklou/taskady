import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-full flex-col bg-forest text-paper">
      <header className="mx-auto flex w-full max-w-xl items-center justify-between px-4 py-4">
        <div className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-2xl bg-lime text-xl font-bold text-forest">
            T
          </span>
          <span className="text-xl font-bold tracking-tight">taskady</span>
        </div>
        <div className="flex gap-2">
          <Link
            href="/login"
            className="tap-target rounded-full border-2 border-paper/30 px-4 py-2 text-sm font-bold"
          >
            Log in
          </Link>
          <Link
            href="/signup"
            className="tap-target rounded-full bg-lime px-4 py-2 text-sm font-bold text-forest"
          >
            Sign up
          </Link>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col px-4 pb-10">
        <p className="mt-6 text-xs font-bold uppercase tracking-[0.2em] text-lime">
          Welcome to the world of focus
        </p>
        <h1 className="mt-2 text-5xl font-bold leading-[0.95] tracking-tight">
          Small tasks.
          <br />
          Big movement.
        </h1>
        <p className="mt-4 max-w-md text-base text-paper/80">
          Taskady is a mobile-first productivity app: capture tasks with notes,
          priorities and categories, focus with a simple Pomodoro timer, and
          celebrate every win with confetti.
        </p>

        <div className="mt-6 flex flex-col gap-2">
          <Link
            href="/signup"
            className="btn-smooth tap-target rounded-2xl bg-lime px-5 py-3.5 text-center text-base font-bold text-forest shadow-[0_3px_0_rgba(211,247,115,0.4)]"
          >
            Let&apos;s build good habits →
          </Link>
          <Link
            href="/login"
            className="btn-smooth tap-target rounded-2xl border-2 border-paper/25 px-5 py-3 text-center text-base font-bold"
          >
            I already have an account
          </Link>
        </div>

        <div className="mt-6 rounded-3xl bg-paper p-4 text-ink">
          <p className="text-sm font-bold text-forest">
            Try instantly — no setup needed
          </p>
          <p className="mt-1 text-sm text-ink/70">
            Use the default test account to experience the app:
          </p>
          <div className="mt-2 flex items-center justify-between gap-2 rounded-2xl bg-cream px-4 py-3 font-mono text-sm font-bold text-forest">
            <span>demo / demo1234</span>
            <Link
              href="/login"
              className="rounded-full bg-forest px-3 py-1.5 font-sans text-xs font-bold text-lime"
            >
              Try now
            </Link>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-3">
          {[
            ["📝", "Tasks with notes", "Optional notes, 3 priority levels, flexible categories."],
            ["🔎", "Real-time find", "Search + category & priority filters update instantly."],
            ["🍅", "Pomodoro focus", "Simple 25/5 timer. You — never the timer — mark tasks done."],
            ["🎉", "Celebrate wins", "Confetti + motivational alert after focus and completions."],
          ].map(([emoji, title, desc]) => (
            <div key={title} className="rounded-3xl bg-paper/10 p-4">
              <p className="text-2xl">{emoji}</p>
              <p className="mt-1 font-bold">{title}</p>
              <p className="text-sm text-paper/70">{desc}</p>
            </div>
          ))}
        </div>
      </main>

      <footer className="border-t border-paper/15 py-4 text-center text-xs text-paper/60">
        taskady · Made to move. Meant to last.
      </footer>
    </div>
  );
}
