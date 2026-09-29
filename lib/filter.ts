import type { Priority, Task, TaskStatus } from "./types";

export interface TaskFilter {
  q?: string;
  category?: string; // "ALL" or exact name
  priority?: string; // "ALL" | Priority
  status?: string; // "ALL" | TaskStatus
}

/**
 * Pure, shared filtering logic used by both the API (GET /api/tasks)
 * and the dashboard client for instant real-time filtering.
 * A single query matches title, note and category (case-insensitive).
 */
export function filterTasks(tasks: Task[], filter: TaskFilter): Task[] {
  const q = (filter.q ?? "").trim().toLowerCase();
  const category = filter.category ?? "ALL";
  const priority = filter.priority ?? "ALL";
  const status = filter.status ?? "ALL";

  return tasks.filter((t) => {
    if (category !== "ALL" && t.category !== category) return false;
    if (priority !== "ALL" && t.priority !== (priority as Priority))
      return false;
    if (status !== "ALL" && t.status !== (status as TaskStatus)) return false;
    if (q) {
      const hay = `${t.title} ${t.note} ${t.category}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

export function uniqueCategories(tasks: Task[]): string[] {
  const set = new Set<string>();
  for (const t of tasks) {
    if (t.category) set.add(t.category);
  }
  return [...set].sort((a, b) => a.localeCompare(b));
}
