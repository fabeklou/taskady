"use client";

import { PRIORITY_META, type Task } from "@/lib/types";
import {
  formatCreated,
  formatDue,
  isDueSoon,
  isOverdue,
} from "@/lib/reminders";

interface Props {
  task: Task;
  index: number;
  dragHandleProps?: React.HTMLAttributes<HTMLButtonElement>;
  isDragging?: boolean;
  focusActive?: boolean;
  onToggle: (task: Task) => void;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
  onFocus: (task: Task) => void;
}

export default function TaskCard({
  task,
  index,
  dragHandleProps,
  isDragging,
  focusActive,
  onToggle,
  onEdit,
  onDelete,
  onFocus,
}: Props) {
  const meta = PRIORITY_META[task.priority];
  const done = task.status === "DONE";
  const overdue = isOverdue(task);
  const dueSoon = isDueSoon(task);

  return (
    <article
      className={`task-card card-in rounded-3xl border-2 bg-white p-4 shadow-[0_2px_0_#163300] ${
        done ? "opacity-70" : ""
      } ${overdue ? "border-coral-pop/60" : "border-forest/10"} ${
        isDragging ? "dragging-card" : ""
      }`}
      style={{ animationDelay: `${Math.min(index, 8) * 45}ms` }}
    >
      <div className="flex items-start gap-3">
        <button
          aria-label="Drag to reorder"
          title="Drag to reorder"
          {...dragHandleProps}
          className="drag-handle tap-target mt-0.5 grid w-7 shrink-0 place-items-center rounded-full text-base font-bold text-forest/40 transition-colors hover:bg-cream hover:text-forest active:cursor-grabbing"
        >
          ⋮⋮
        </button>
        <button
          aria-label={done ? "Reopen task" : "Mark task done"}
          onClick={() => onToggle(task)}
          className={`btn-smooth tap-target mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full border-2 border-forest text-sm font-bold ${
            done ? "bg-lime text-forest" : "bg-paper text-transparent"
          }`}
        >
          ✓
        </button>
        <div className="min-w-0 flex-1">
          <h3
            className={`text-base font-bold leading-snug text-forest ${
              done ? "line-through" : ""
            }`}
          >
            {task.title}
          </h3>
          {task.note ? (
            <p className="mt-1 line-clamp-2 text-sm text-ink/70">{task.note}</p>
          ) : null}
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-bold ${meta.chip}`}
            >
              <span className={`h-2.5 w-2.5 rounded-full ${meta.dot}`} />
              {meta.label}
            </span>
            <span className="rounded-full bg-cream px-2.5 py-1 font-semibold text-forest">
              {task.category}
            </span>
            {task.pomodoros > 0 ? (
              <span className="rounded-full bg-forest px-2.5 py-1 font-semibold text-lime">
                🍅 × {task.pomodoros}
              </span>
            ) : null}
          </div>
          {task.dueAt ? (
            <p
              className={`mt-2 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${
                done
                  ? "bg-cream text-ink/60"
                  : overdue
                    ? "reminder-pulse bg-coral-pop/15 text-forest"
                    : dueSoon
                      ? "bg-amber-pop/25 text-forest"
                      : "bg-cream text-forest"
              }`}
            >
              {overdue && !done ? "⚠️ Overdue · " : "📅 Due "}
              {formatDue(task.dueAt)}
            </p>
          ) : null}
          <p className="mt-1.5 text-[11px] font-medium text-ink/45">
            Created {formatCreated(task.createdAt)}
          </p>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2">
        <button
          onClick={() => onFocus(task)}
          disabled={done || focusActive}
          title={focusActive ? "Timer already running on this task" : "Start focus timer"}
          className={`btn-smooth tap-target rounded-2xl px-2 py-2 text-sm font-bold disabled:cursor-not-allowed ${
            focusActive
              ? "bg-lime/60 text-forest disabled:opacity-100"
              : "bg-forest text-lime disabled:opacity-40"
          }`}
        >
          {focusActive ? "● Focusing" : "▶ Focus"}
        </button>
        <button
          onClick={() => onEdit(task)}
          className="btn-smooth tap-target rounded-2xl border-2 border-forest/15 bg-paper px-2 py-2 text-sm font-bold text-forest"
        >
          Edit
        </button>
        <button
          onClick={() => onDelete(task)}
          className="btn-smooth tap-target rounded-2xl border-2 border-coral-pop/30 bg-coral-pop/10 px-2 py-2 text-sm font-bold text-forest"
        >
          Delete
        </button>
      </div>
    </article>
  );
}
