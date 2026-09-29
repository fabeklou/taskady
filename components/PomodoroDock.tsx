"use client";

import { formatClock } from "@/lib/pomodoro";
import { modeLabel, type PomodoroApi } from "./usePomodoro";

interface Props {
  pomo: PomodoroApi;
  onExpand: () => void;
}

/** Persistent mini-player: the timer keeps running while you scroll tasks. */
export default function PomodoroDock({ pomo, onExpand }: Props) {
  const { snap, secondsLeft, toggle, stop } = pomo;
  if (!snap.taskId) return null;

  return (
    <div className="pop-in pointer-events-auto mx-auto w-full max-w-xl px-4">
      <div className="flex items-center gap-3 rounded-3xl border-2 border-lime/40 bg-forest/90 px-4 py-2.5 text-paper shadow-lg backdrop-blur-md">
        <span className="relative flex h-3 w-3 shrink-0">
          {snap.running ? (
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-lime opacity-60" />
          ) : null}
          <span className="relative inline-flex h-3 w-3 rounded-full bg-lime" />
        </span>
        <button onClick={onExpand} className="min-w-0 flex-1 text-left">
          <p className="truncate text-sm font-bold">
            {modeLabel(snap.mode)} ·{" "}
            <span className="tabular-nums">{formatClock(secondsLeft)}</span>
          </p>
          <p className="truncate text-xs text-paper/65">{snap.taskTitle}</p>
        </button>
        <button
          onClick={toggle}
          aria-label={snap.running ? "Pause timer" : "Resume timer"}
          className="btn-smooth tap-target grid h-10 w-10 shrink-0 place-items-center rounded-full bg-lime text-base font-bold text-forest"
        >
          {snap.running ? "⏸" : "▶"}
        </button>
        <button
          onClick={stop}
          aria-label="Stop timer"
          className="btn-smooth tap-target grid h-10 w-10 shrink-0 place-items-center rounded-full bg-paper/15 text-sm font-bold"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
