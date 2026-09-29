/** Pomodoro defaults (seconds). 25 min focus / 5 min break. */
export const FOCUS_SECONDS = 25 * 60;
export const BREAK_SECONDS = 5 * 60;

export type PomodoroMode = "focus" | "break";

export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
}

export const CELEBRATION_MESSAGES = [
  "Focus paid off. One step closer!",
  "Small wins compound. Keep moving!",
  "Done is better than perfect. Nice work!",
  "Your future self says thanks!",
  "Momentum looks good on you!",
];

export function pickCelebration(seed = Date.now()): string {
  return CELEBRATION_MESSAGES[seed % CELEBRATION_MESSAGES.length];
}
