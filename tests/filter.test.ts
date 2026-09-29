import { describe, expect, it } from "vitest";
import { filterTasks, uniqueCategories } from "@/lib/filter";
import type { Task } from "@/lib/types";

const tasks: Task[] = [
  {
    id: "1",
    userId: "u1",
    title: "Write report",
    note: "Q3 numbers",
    priority: "HIGH",
    category: "Work",
    status: "OPEN",
    pomodoros: 0,
    completedAt: null,
    dueAt: null,
    remindBefore: "NONE",
    position: 0,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "2",
    userId: "u1",
    title: "Buy milk",
    note: "",
    priority: "LOW",
    category: "Personal",
    status: "DONE",
    pomodoros: 2,
    completedAt: null,
    dueAt: null,
    remindBefore: "NONE",
    position: 1,
    createdAt: "2026-01-02T00:00:00.000Z",
    updatedAt: "2026-01-02T00:00:00.000Z",
  },
  {
    id: "3",
    userId: "u1",
    title: "Study maths",
    note: "chapter 4",
    priority: "MEDIUM",
    category: "Study",
    status: "OPEN",
    pomodoros: 1,
    completedAt: null,
    dueAt: null,
    remindBefore: "NONE",
    position: 2,
    createdAt: "2026-01-03T00:00:00.000Z",
    updatedAt: "2026-01-03T00:00:00.000Z",
  },
];

describe("filterTasks (shared by GET /api/tasks and dashboard real-time filter)", () => {
  it("searches title, note and category case-insensitively", () => {
    expect(filterTasks(tasks, { q: "report" })).toHaveLength(1);
    expect(filterTasks(tasks, { q: "Q3" })).toHaveLength(1);
    expect(filterTasks(tasks, { q: "study" })).toHaveLength(1);
    expect(filterTasks(tasks, { q: "zzz" })).toHaveLength(0);
  });

  it("filters by exact category", () => {
    expect(filterTasks(tasks, { category: "Work" }).map((t) => t.id)).toEqual(["1"]);
    expect(filterTasks(tasks, { category: "ALL" })).toHaveLength(3);
  });

  it("combines priority + status + query", () => {
    expect(
      filterTasks(tasks, { priority: "HIGH", status: "OPEN", q: "" })
    ).toHaveLength(1);
    expect(filterTasks(tasks, { status: "DONE" }).map((t) => t.id)).toEqual(["2"]);
  });
});

describe("uniqueCategories", () => {
  it("returns sorted unique names", () => {
    expect(uniqueCategories(tasks)).toEqual(["Personal", "Study", "Work"]);
  });
});
