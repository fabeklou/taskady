"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function SignupPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Signup failed");
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Network error. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-full flex-1 flex-col bg-forest text-paper">
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-10">
        <Link href="/" className="text-sm font-bold text-lime">
          ← taskady
        </Link>
        <h1 className="mt-2 text-4xl font-bold tracking-tight">
          Create your account
        </h1>
        <p className="mt-1 text-sm text-paper/70">
          Just a username + password. Your tasks stay private to you.
        </p>

        <form
          onSubmit={submit}
          className="mt-6 flex flex-col gap-3 rounded-3xl bg-paper p-5 text-ink"
        >
          <label className="flex flex-col gap-1 text-sm font-bold text-forest">
            Username
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. focus-fan"
              autoComplete="username"
              className="tap-target rounded-2xl border-2 border-forest/20 bg-white px-4 text-base font-medium outline-none placeholder:text-ink/40 focus:border-forest"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-bold text-forest">
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min. 6 characters"
              autoComplete="new-password"
              className="tap-target rounded-2xl border-2 border-forest/20 bg-white px-4 text-base font-medium outline-none placeholder:text-ink/40 focus:border-forest"
            />
          </label>
          {error ? (
            <p className="rounded-2xl bg-coral-pop/15 px-4 py-2 text-sm font-semibold text-forest">
              {error}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={loading}
            className="btn-smooth tap-target rounded-2xl bg-lime px-4 py-3 text-base font-bold text-forest shadow-[0_3px_0_#163300] disabled:opacity-50"
          >
            {loading ? "Creating…" : "Create account"}
          </button>
          <p className="text-center text-sm text-ink/60">
            Already have one?{" "}
            <Link href="/login" className="font-bold text-forest underline">
              Log in
            </Link>
          </p>
        </form>
      </main>
    </div>
  );
}
