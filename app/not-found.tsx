import Link from "next/link";

/** Friendly 404 for mistyped URLs — always a way back, no dead ends. */
export default function NotFound() {
  return (
    <div className="flex min-h-full flex-col bg-forest text-paper">
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center px-4 pb-10 text-center">
        <p className="grid h-16 w-16 place-items-center rounded-3xl bg-lime text-3xl font-bold text-forest">
          ?
        </p>
        <h1 className="mt-4 text-4xl font-bold tracking-tight">
          This path goes nowhere
        </h1>
        <p className="mt-2 max-w-md text-base text-paper/80">
          The page you&apos;re looking for doesn&apos;t exist. Your tasks are
          safe — let&apos;s get you back to them.
        </p>
        <div className="mt-6 flex w-full max-w-md flex-col gap-2">
          <Link
            href="/dashboard"
            className="btn-smooth tap-target rounded-2xl bg-lime px-5 py-3.5 text-center text-base font-bold text-forest"
          >
            Back to my tasks →
          </Link>
          <Link
            href="/"
            className="btn-smooth tap-target rounded-2xl border-2 border-paper/25 px-5 py-3 text-center text-base font-bold"
          >
            Home
          </Link>
        </div>
      </main>
    </div>
  );
}
