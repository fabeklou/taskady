export type Priority = "LOW" | "MEDIUM" | "HIGH";
export type TaskStatus = "OPEN" | "DONE";
export type RemindBefore = "NONE" | "DAY" | "3H" | "1H";

export interface Task {
  id: string;
  userId: string;
  title: string;
  note: string;
  priority: Priority;
  category: string;
  status: TaskStatus;
  pomodoros: number;
  /** ISO datetime when the task was last marked DONE (null while open). Set server-side. */
  completedAt: string | null;
  /** ISO datetime string or null */
  dueAt: string | null;
  remindBefore: RemindBefore;
  /** Manual order within the user's list (0 = top) */
  position: number;
  createdAt: string;
  updatedAt: string;
}

export interface CategoryInfo {
  name: string;
  count: number;
}

export interface PublicUser {
  id: string;
  username: string;
}

export const PRIORITY_META: Record<
  Priority,
  { label: string; dot: string; chip: string }
> = {
  LOW: {
    label: "Low",
    dot: "bg-lime",
    chip: "bg-lime-soft text-forest border-forest/20",
  },
  MEDIUM: {
    label: "Medium",
    dot: "bg-amber-pop",
    chip: "bg-amber-pop/20 text-forest border-forest/20",
  },
  HIGH: {
    label: "High",
    dot: "bg-coral-pop",
    chip: "bg-coral-pop/15 text-forest border-forest/20",
  },
};

export const REMINDER_OPTIONS: Array<{
  value: RemindBefore;
  label: string;
  offsetMs: number;
}> = [
  { value: "NONE", label: "No reminder", offsetMs: 0 },
  { value: "1H", label: "1 hour before", offsetMs: 60 * 60 * 1000 },
  { value: "3H", label: "3 hours before", offsetMs: 3 * 60 * 60 * 1000 },
  { value: "DAY", label: "A day before", offsetMs: 24 * 60 * 60 * 1000 },
];
