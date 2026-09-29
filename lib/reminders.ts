import { REMINDER_OPTIONS, type RemindBefore, type Task } from "./types";

export function reminderOffsetMs(value: RemindBefore): number {
  return REMINDER_OPTIONS.find((o) => o.value === value)?.offsetMs ?? 0;
}

/**
 * True when a reminder should fire right now: the task is open, has a due
 * date + reminder set, and `now` is inside [due - offset, due].
 * Pure function — easy to test, reused by the dashboard reminder checker.
 */
export function isReminderDue(task: Task, nowMs = Date.now()): boolean {
  if (task.status !== "OPEN") return false;
  if (!task.dueAt || task.remindBefore === "NONE") return false;
  const due = Date.parse(task.dueAt);
  if (Number.isNaN(due)) return false;
  const offset = reminderOffsetMs(task.remindBefore);
  return nowMs >= due - offset && nowMs <= due;
}

export function isOverdue(task: Task, nowMs = Date.now()): boolean {
  if (task.status !== "OPEN" || !task.dueAt) return false;
  const due = Date.parse(task.dueAt);
  return !Number.isNaN(due) && due < nowMs;
}

export function isDueSoon(task: Task, nowMs = Date.now()): boolean {
  if (task.status !== "OPEN" || !task.dueAt || isOverdue(task, nowMs))
    return false;
  const due = Date.parse(task.dueAt);
  return !Number.isNaN(due) && due - nowMs <= 24 * 60 * 60 * 1000;
}

function datePart(d: Date): string {
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function timePart(d: Date): string {
  return d.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatCreated(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${datePart(d)}, ${timePart(d)}`;
}

export function formatDue(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  const isTomorrow = d.toDateString() === tomorrow.toDateString();
  if (sameDay) return `Today, ${timePart(d)}`;
  if (isTomorrow) return `Tomorrow, ${timePart(d)}`;
  return `${datePart(d)}, ${timePart(d)}`;
}

/** Convert ISO string → value for <input type="datetime-local"> (local tz). */
export function toLocalInputValue(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

/** Convert <input type="datetime-local"> value → ISO string or null. */
export function fromLocalInputValue(value: string): string | null {
  const v = value.trim();
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}
