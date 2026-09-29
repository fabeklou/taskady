"use client";

import { formatClock } from "@/lib/pomodoro";
import { modeLabel, type PomodoroApi, type PomoMode } from "./usePomodoro";

interface Props {
  pomo: PomodoroApi;
  focusMode: boolean;
  onClose: () => void;
  onToggleTimer: () => void;
  onStartFocusSession: () => void;
}

const MODES: PomoMode[] = ["focus", "short", "long"];

export default function PomodoroTimer({
  pomo,
  focusMode,
  onClose,
  onToggleTimer,
  onStartFocusSession,
}: Props) {
  const { snap, secondsLeft, reset, switchMode, updateSettings, stop } = pomo;
  const progress =
    snap.totalSec > 0 ? 1 - secondsLeft / snap.totalSec : 0;

  function settingInput(
    label: string,
    value: number,
    onChange: (v: number) => void
  ) {
    return (
      <label className="flex flex-1 flex-col gap-1 text-xs font-bold text-paper/70">
        {label}
        <input
          type="number"
          min={1}
          max={120}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="tap-target w-full rounded-xl border-2 border-paper/25 bg-paper/10 px-3 text-center text-base font-bold text-paper outline-none transition-colors focus:border-lime"
        />
      </label>
    );
  }

  return (
    <div className="overlay-in fixed inset-0 z-40 flex items-end justify-center bg-forest/60 sm:items-center sm:p-4">
      <div className="sheet-up max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-forest p-6 pb-safe text-paper sm:rounded-3xl">
        <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-paper/25 sm:hidden" />
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold uppercase tracking-widest text-lime">
            {modeLabel(snap.mode)} · {formatClock(snap.totalSec)} ·{" "}
            {snap.running ? "running" : "paused"}
          </p>
          <button
            onClick={onClose}
            aria-label="Minimize timer (keeps running)"
            title="Minimize — timer keeps running"
            className="btn-smooth grid h-11 w-11 shrink-0 place-items-center rounded-full bg-paper/15 text-paper"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="m4 6 4 4 4-4" />
            </svg>
          </button>
        </div>
        <h2 className="mt-2 line-clamp-2 text-xl font-bold">
          {snap.taskTitle || "Focus session"}
        </h2>

        <div className="mx-auto mt-5 grid h-44 w-44 place-items-center rounded-full border-8 border-lime/30 transition-colors">
          <div className="text-center">
            <p className="text-4xl font-bold tabular-nums">
              {formatClock(secondsLeft)}
            </p>
            <p className="mt-1 text-xs font-semibold text-paper/70">
              {snap.running ? "Stay with it…" : "Paused"}
            </p>
          </div>
        </div>

        <div
          aria-hidden
          className="mt-4 h-2 overflow-hidden rounded-full bg-paper/15"
        >
          <div
            className="h-full rounded-full bg-lime transition-all duration-500"
            style={{ width: `${Math.round(progress * 100)}%` }}
          />
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2">
          {MODES.map((m) => (
            <button
              key={m}
              onClick={() => switchMode(m)}
              aria-pressed={snap.mode === m}
              className={`btn-smooth tap-target rounded-2xl px-2 py-2.5 text-xs font-bold ${
                snap.mode === m ? "bg-lime text-forest" : "bg-paper/15 text-paper"
              }`}
            >
              {m === "focus"
                ? `Focus ${snap.settings.focusMin}`
                : m === "short"
                  ? `Short ${snap.settings.shortMin}`
                  : `Long ${snap.settings.longMin}`}
            </button>
          ))}
        </div>

        <button
          onClick={onStartFocusSession}
          className={`btn-smooth tap-target mt-4 w-full rounded-2xl px-4 py-3.5 text-base font-bold shadow-[0_3px_0_rgba(211,247,115,0.4)] ${
            focusMode ? "bg-paper text-forest" : "bg-lime text-forest"
          }`}
        >
          {focusMode
            ? "● Focus session live — everything else is dimmed"
            : "🎯 Start focus session"}
        </button>

        <div className="mt-2 grid grid-cols-3 gap-2">
          <button
            onClick={onToggleTimer}
            className="btn-smooth tap-target rounded-2xl bg-lime px-3 py-3 text-sm font-bold text-forest"
          >
            {snap.running ? "Pause" : "Start"}
          </button>
          <button
            onClick={reset}
            className="btn-smooth tap-target rounded-2xl bg-paper/15 px-3 py-3 text-sm font-bold"
          >
            Reset
          </button>
          <button
            onClick={() => {
              stop();
              onClose();
            }}
            className="btn-smooth tap-target rounded-2xl border-2 border-paper/30 px-3 py-3 text-sm font-bold"
          >
            Stop
          </button>
        </div>

        <details className="mt-4 rounded-2xl bg-paper/10 p-3">
          <summary className="text-sm font-bold text-lime">
            ⚙️ Timer lengths (minutes)
          </summary>
          <div className="mt-2 flex gap-2">
            {settingInput("Focus", snap.settings.focusMin, (v) =>
              updateSettings({ ...snap.settings, focusMin: v })
            )}
            {settingInput("Short break", snap.settings.shortMin, (v) =>
              updateSettings({ ...snap.settings, shortMin: v })
            )}
            {settingInput("Long break", snap.settings.longMin, (v) =>
              updateSettings({ ...snap.settings, longMin: v })
            )}
          </div>
          <p className="mt-2 text-xs text-paper/60">
            Long break auto-starts after every 4th focus. A sound plays once at
            the end of each phase.
          </p>
        </details>

        <p className="mt-3 text-center text-xs text-paper/60">
          Minimizing keeps the timer running — it survives reloads too. Tasks
          are only marked done manually.
        </p>
        <div aria-hidden className="h-4" />
      </div>
    </div>
  );
}
