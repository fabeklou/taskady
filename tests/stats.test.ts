import { describe, expect, it } from "vitest";
import {
  bestDay,
  buildHeatmap,
  computeStreak,
  levelFor,
  totalCompletions,
} from "@/lib/stats";
import type { Task } from "@/lib/types";

const DAY = 24 * 60 * 60 * 1000;
const NOW = new Date("2026-09-29T12:00:00").getTime();

function doneDaysAgo(days: number, id: string): Task {
  const d = new Date(NOW - days * DAY);
  return {
    id,
    userId: "u1",
    title: id,
    note: "",
    priority: "MEDIUM",
    category: "General",
    status: "DONE",
    pomodoros: 0,
    completedAt: d.toISOString(),
    dueAt: null,
    remindBefore: "NONE",
    position: 0,
    createdAt: d.toISOString(),
    updatedAt: d.toISOString(),
  };
}

describe("levelFor", () => {
  it("buckets counts into 5 levels", () => {
    expect(levelFor(0)).toBe(0);
    expect(levelFor(1)).toBe(1);
    expect(levelFor(2)).toBe(1);
    expect(levelFor(4)).toBe(2);
    expect(levelFor(6)).toBe(3);
    expect(levelFor(7)).toBe(4);
    expect(levelFor(99)).toBe(4);
  });
});

describe("buildHeatmap", () => {
  it("counts completions per day, newest last with today flagged", () => {
    const tasks = [doneDaysAgo(0, "a"), doneDaysAgo(0, "b"), doneDaysAgo(2, "c")];
    const cells = buildHeatmap(tasks, 7, NOW);
    expect(cells).toHaveLength(7);
    expect(cells[6].isToday).toBe(true);
    expect(cells[6].count).toBe(2);
    expect(cells[4].count).toBe(1);
    expect(cells[0].count).toBe(0);
  });

  it("ignores open tasks and tasks without completedAt", () => {
    const open: Task = { ...doneDaysAgo(0, "x"), status: "OPEN" };
    const noStamp: Task = { ...doneDaysAgo(0, "y"), completedAt: null };
    expect(totalCompletions([open, noStamp])).toBe(0);
    expect(buildHeatmap([open, noStamp], 3, NOW)[2].count).toBe(0);
  });
});

describe("computeStreak", () => {
  it("counts consecutive days ending today", () => {
    const tasks = [doneDaysAgo(0, "a"), doneDaysAgo(1, "b"), doneDaysAgo(2, "c")];
    expect(computeStreak(tasks, NOW)).toBe(3);
  });

  it("stays alive when today is empty but yesterday delivered", () => {
    const tasks = [doneDaysAgo(1, "a"), doneDaysAgo(2, "b")];
    expect(computeStreak(tasks, NOW)).toBe(2);
  });

  it("breaks on a gap day", () => {
    const tasks = [doneDaysAgo(0, "a"), doneDaysAgo(2, "b")];
    expect(computeStreak(tasks, NOW)).toBe(1);
  });

  it("is zero with no completions", () => {
    expect(computeStreak([], NOW)).toBe(0);
  });
});

describe("bestDay", () => {
  it("picks the highest-count day, null when empty", () => {
    const cells = buildHeatmap([doneDaysAgo(1, "a"), doneDaysAgo(1, "b")], 5, NOW);
    expect(bestDay(cells)?.count).toBe(2);
    expect(bestDay(buildHeatmap([], 5, NOW))).toBeNull();
  });
});
