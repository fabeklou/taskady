"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { playPhaseSound } from "@/lib/sound";

export type PomoMode = "focus" | "short" | "long";

export interface PomoSettings {
  focusMin: number;
  shortMin: number;
  longMin: number;
}

export interface PomoSnapshot {
  taskId: string | null;
  taskTitle: string;
  mode: PomoMode;
  endsAt: number | null; // epoch ms when the current phase ends
  totalSec: number; // phase length for progress ring
  running: boolean;
  /** Remaining seconds frozen at pause time (null when not paused). */
  pausedSec: number | null;
  cycle: number; // focus sessions completed in this set (long break every 4th)
  settings: PomoSettings;
}

const DEFAULT_STORAGE_KEY = "taskady-pomo-v1";
const DEFAULTS: PomoSettings = { focusMin: 25, shortMin: 5, longMin: 15 };

function modeSeconds(mode: PomoMode, s: PomoSettings): number {
  if (mode === "focus") return Math.max(1, Math.round(s.focusMin * 60));
  if (mode === "short") return Math.max(1, Math.round(s.shortMin * 60));
  return Math.max(1, Math.round(s.longMin * 60));
}

function loadSnapshot(key: string): PomoSnapshot | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PomoSnapshot>;
    if (!parsed || typeof parsed !== "object") return null;
    return {
      taskId: typeof parsed.taskId === "string" ? parsed.taskId : null,
      taskTitle: typeof parsed.taskTitle === "string" ? parsed.taskTitle : "",
      mode: parsed.mode === "short" || parsed.mode === "long" ? parsed.mode : "focus",
      endsAt: typeof parsed.endsAt === "number" ? parsed.endsAt : null,
      totalSec: typeof parsed.totalSec === "number" ? parsed.totalSec : 1500,
      running: parsed.running === true && typeof parsed.endsAt === "number",
      pausedSec:
        typeof parsed.pausedSec === "number" && parsed.pausedSec > 0
          ? Math.floor(parsed.pausedSec)
          : null,
      cycle: typeof parsed.cycle === "number" ? parsed.cycle : 0,
      settings: {
        focusMin: Number(parsed.settings?.focusMin) || DEFAULTS.focusMin,
        shortMin: Number(parsed.settings?.shortMin) || DEFAULTS.shortMin,
        longMin: Number(parsed.settings?.longMin) || DEFAULTS.longMin,
      },
    };
  } catch {
    return null;
  }
}

export function modeLabel(mode: PomoMode): string {
  return mode === "focus" ? "Focus" : mode === "short" ? "Short break" : "Long break";
}

/**
 * Background-capable pomodoro state. Time is derived from a wall-clock
 * `endsAt` timestamp, so it keeps running while the sheet is closed,
 * while scrolling the list, and across page reloads (localStorage).
 *
 * `storageKey` MUST be scoped per user (e.g. include the username) so a
 * timer started by one account never leaks into another account's session
 * on the same device.
 */
export function usePomodoro(
  onPhaseEnd: (mode: PomoMode, cycle: number) => void,
  storageKey = DEFAULT_STORAGE_KEY
) {
  const [snap, setSnap] = useState<PomoSnapshot>({
    taskId: null,
    taskTitle: "",
    mode: "focus",
    endsAt: null,
    totalSec: DEFAULTS.focusMin * 60,
    running: false,
    pausedSec: null,
    cycle: 0,
    settings: DEFAULTS,
  });
  const [secondsLeft, setSecondsLeft] = useState(DEFAULTS.focusMin * 60);
  const [hydrated, setHydrated] = useState(false);
  const onPhaseEndRef = useRef(onPhaseEnd);
  useEffect(() => {
    onPhaseEndRef.current = onPhaseEnd;
  });
  const firedForEndsAt = useRef<number | null>(null);

  // Restore persisted timer once (background running across reloads).
  useEffect(() => {
    const saved = loadSnapshot(storageKey);
    if (saved) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time restore of the persisted background timer
      setSnap(saved);
      if (saved.endsAt && saved.running) {
        setSecondsLeft(Math.max(0, Math.round((saved.endsAt - Date.now()) / 1000)));
      } else {
        setSecondsLeft(saved.totalSec);
      }
    }
    setHydrated(true);
  }, [storageKey]);

  // Persist every change.
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(snap));
    } catch {
      /* storage unavailable — timer still works in memory */
    }
  }, [snap, hydrated, storageKey]);

  // Tick from wall clock so background time stays accurate.
  useEffect(() => {
    if (!snap.running || !snap.endsAt) return;
    const id = setInterval(() => {
      const left = Math.round((snap.endsAt as number) - Date.now()) / 1000;
      setSecondsLeft(Math.max(0, Math.floor(left)));
    }, 500);
    return () => clearInterval(id);
  }, [snap.running, snap.endsAt]);

  // Phase completion: sound once, notify parent, auto-advance + keep running.
  useEffect(() => {
    if (!hydrated || !snap.running || !snap.endsAt) return;
    if (secondsLeft > 0 || firedForEndsAt.current === snap.endsAt) return;
    firedForEndsAt.current = snap.endsAt;
    playPhaseSound(snap.mode);
    const finishedMode = snap.mode;
    const nextCycle = finishedMode === "focus" ? snap.cycle + 1 : snap.cycle;
    const nextMode: PomoMode =
      finishedMode === "focus"
        ? nextCycle % 4 === 0
          ? "long"
          : "short"
        : "focus";
    const total = modeSeconds(nextMode, snap.settings);
    setSnap((s) => ({
      ...s,
      mode: nextMode,
      cycle: nextCycle,
      totalSec: total,
      endsAt: Date.now() + total * 1000,
      running: true,
      pausedSec: null,
    }));
    setSecondsLeft(total);
    onPhaseEndRef.current(finishedMode, nextCycle);
  }, [secondsLeft, snap.running, snap.endsAt, snap.mode, snap.cycle, snap.settings, hydrated]);

  const startFocus = useCallback((taskId: string, taskTitle: string) => {
    firedForEndsAt.current = null;
    setSnap((s) => {
      const total = modeSeconds("focus", s.settings);
      setSecondsLeft(total);
      return {
        ...s,
        taskId,
        taskTitle,
        mode: "focus",
        totalSec: total,
        endsAt: Date.now() + total * 1000,
        running: true,
        pausedSec: null,
      };
    });
  }, []);

  const snapRef = useRef(snap);
  useEffect(() => {
    snapRef.current = snap;
  });

  const toggle = useCallback(() => {
    const s = snapRef.current;
    if (s.running && s.endsAt) {
      // Pause: freeze the remaining time so resume continues from here.
      const remaining = Math.max(0, Math.round((s.endsAt - Date.now()) / 1000));
      setSecondsLeft(remaining);
      setSnap({
        ...s,
        running: false,
        endsAt: null,
        pausedSec: remaining,
        totalSec: Math.max(remaining, 1),
      });
      return;
    }
    // Resume from pause, or fresh-start the current mode.
    const total =
      s.pausedSec !== null && s.pausedSec > 0
        ? s.pausedSec
        : modeSeconds(s.mode, s.settings);
    setSecondsLeft(total);
    setSnap({
      ...s,
      running: true,
      pausedSec: null,
      endsAt: Date.now() + total * 1000,
      totalSec: total,
    });
  }, []);

  const reset = useCallback(() => {
    firedForEndsAt.current = null;
    setSnap((s) => {
      const total = modeSeconds(s.mode, s.settings);
      setSecondsLeft(total);
      return { ...s, running: false, endsAt: null, totalSec: total };
    });
  }, []);

  const switchMode = useCallback((mode: PomoMode) => {
    firedForEndsAt.current = null;
    setSnap((s) => {
      const total = modeSeconds(mode, s.settings);
      setSecondsLeft(total);
      return { ...s, mode, running: false, endsAt: null, pausedSec: null, totalSec: total };
    });
  }, []);

  const updateSettings = useCallback((settings: PomoSettings) => {
    const clean: PomoSettings = {
      focusMin: Math.min(120, Math.max(1, Math.round(settings.focusMin) || 1)),
      shortMin: Math.min(60, Math.max(1, Math.round(settings.shortMin) || 1)),
      longMin: Math.min(90, Math.max(1, Math.round(settings.longMin) || 1)),
    };
    setSnap((s) => {
      if (s.running) return { ...s, settings: clean };
      const total = modeSeconds(s.mode, clean);
      setSecondsLeft(total);
      return { ...s, settings: clean, totalSec: total, endsAt: null };
    });
  }, []);

  const stop = useCallback(() => {
    firedForEndsAt.current = null;
    setSnap((s) => ({
      ...s,
      taskId: null,
      taskTitle: "",
      running: false,
      endsAt: null,
    }));
  }, []);

  return {
    snap,
    secondsLeft,
    hydrated,
    active: snap.taskId !== null,
    startFocus,
    toggle,
    reset,
    switchMode,
    updateSettings,
    stop,
  };
}

export type PomodoroApi = ReturnType<typeof usePomodoro>;
