import type { Task } from "./types";

export type HeatLevel = 0 | 1 | 2 | 3 | 4;

export interface HeatDay {
  /** yyyy-mm-dd (local day) */
  key: string;
  date: Date;
  count: number;
  level: HeatLevel;
  isToday: boolean;
}

export function levelFor(count: number): HeatLevel {
  if (count <= 0) return 0;
  if (count <= 2) return 1;
  if (count <= 4) return 2;
  if (count <= 6) return 3;
  return 4;
}

function dayKey(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * Build a GitHub-style heatmap of task completions per local day.
 * Pure + tested; the dashboard derives it from the tasks it already has
 * (no extra endpoint needed).
 */
export function buildHeatmap(tasks: Task[], days = 91, nowMs = Date.now()): HeatDay[] {
  const counts = new Map<string, number>();
  for (const t of tasks) {
    if (t.status !== "DONE" || !t.completedAt) continue;
    const d = new Date(t.completedAt);
    if (Number.isNaN(d.getTime())) continue;
    const key = dayKey(d);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const today = new Date(nowMs);
  today.setHours(0, 0, 0, 0);
  const cells: HeatDay[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    const key = dayKey(date);
    const count = counts.get(key) ?? 0;
    cells.push({
      key,
      date,
      count,
      level: levelFor(count),
      isToday: i === 0,
    });
  }
  return cells;
}

/** Consecutive days with ≥1 completion, ending today or yesterday. */
export function computeStreak(tasks: Task[], nowMs = Date.now()): number {
  const done = new Set<string>();
  for (const t of tasks) {
    if (t.status !== "DONE" || !t.completedAt) continue;
    const d = new Date(t.completedAt);
    if (!Number.isNaN(d.getTime())) done.add(dayKey(d));
  }
  const cursor = new Date(nowMs);
  cursor.setHours(0, 0, 0, 0);
  // A streak stays alive if today has nothing yet but yesterday delivered.
  if (!done.has(dayKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  let streak = 0;
  while (done.has(dayKey(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export function totalCompletions(tasks: Task[]): number {
  return tasks.filter((t) => t.status === "DONE" && t.completedAt).length;
}

export function bestDay(cells: HeatDay[]): HeatDay | null {
  let best: HeatDay | null = null;
  for (const c of cells) {
    if (!best || c.count > best.count) best = c;
  }
  return best && best.count > 0 ? best : null;
}
