"use client";

import {
  DndContext,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import CelebrationModal from "@/components/CelebrationModal";
import DeleteDialog from "@/components/DeleteDialog";
import Header from "@/components/Header";
import Heatmap from "@/components/Heatmap";
import PomodoroDock from "@/components/PomodoroDock";
import PomodoroTimer from "@/components/PomodoroTimer";
import TaskCard from "@/components/TaskCard";
import TaskForm from "@/components/TaskForm";
import { usePomodoro, type PomoMode } from "@/components/usePomodoro";
import { filterTasks } from "@/lib/filter";
import { pickCelebration } from "@/lib/pomodoro";
import { formatDue, isReminderDue } from "@/lib/reminders";
import type { Priority, RemindBefore, Task } from "@/lib/types";

interface CategoryCount {
  name: string;
  count: number;
}

const NOTIFIED_KEY_PREFIX = "taskady-reminded-v1:";

function loadNotified(key: string): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(key);
    const arr = JSON.parse(raw ?? "[]") as string[];
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

function SortableTaskItem({
  task,
  index,
  focusActive,
  onToggle,
  onEdit,
  onDelete,
  onFocus,
}: {
  task: Task;
  index: number;
  focusActive: boolean;
  onToggle: (t: Task) => void;
  onEdit: (t: Task) => void;
  onDelete: (t: Task) => void;
  onFocus: (t: Task) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
    >
      <TaskCard
        task={task}
        index={index}
        dragHandleProps={{ ...attributes, ...listeners }}
        isDragging={isDragging}
        focusActive={focusActive}
        onToggle={onToggle}
        onEdit={onEdit}
        onDelete={onDelete}
        onFocus={onFocus}
      />
    </div>
  );
}

export default function DashboardClient({ username }: { username: string }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [categories, setCategories] = useState<CategoryCount[]>([]);
  const [loading, setLoading] = useState(true);

  // Real-time filters (client-side = instant)
  const [q, setQ] = useState("");
  const [categoryQ, setCategoryQ] = useState("");
  const [category, setCategory] = useState("ALL");
  const [priority, setPriority] = useState("ALL");
  const [status, setStatus] = useState("OPEN");

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const [deleteTarget, setDeleteTarget] = useState<Task | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [timerOpen, setTimerOpen] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [celebration, setCelebration] = useState<{
    title: string;
    message: string;
  } | null>(null);
  const [reminders, setReminders] = useState<Task[]>([]);
  const notifiedRef = useRef<Set<string>>(new Set());
  const pomoTaskRef = useRef<{ id: string; title: string } | null>(null);
  // Per-user persistence keys: a timer or reminder state from one account
  // must never leak into another account on the same device.
  const pomoKey = `taskady-pomo-v1:${username}`;
  const notifiedKey = `${NOTIFIED_KEY_PREFIX}${username}`;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 6 } })
  );

  async function refresh() {
    const [tRes, cRes] = await Promise.all([
      fetch("/api/tasks"),
      fetch("/api/categories"),
    ]);
    if (tRes.ok) {
      const data = await tRes.json();
      setTasks(data.tasks ?? []);
    }
    if (cRes.ok) {
      const data = await cRes.json();
      setCategories(data.categories ?? []);
    }
    setLoading(false);
  }

  useEffect(() => {
    notifiedRef.current = loadNotified(notifiedKey);
    try {
      // One-time cleanup of the pre-fix shared timer key (cross-account leak).
      localStorage.removeItem("taskady-pomo-v1");
    } catch {
      /* ignore */
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch on mount syncs server state
    refresh();
  }, [notifiedKey]);

  const handlePhaseEnd = useCallback(
    async (mode: PomoMode) => {
      // Any completed phase returns the interface to full color.
      setFocusMode(false);
      const current = pomoTaskRef.current;
      if (mode === "focus" && current) {
        await fetch(`/api/tasks/${current.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ incrementPomodoro: true }),
        });
        await refresh();
        setCelebration({
          title: "Pomodoro complete! 🍅",
          message:
            "25 minutes of pure focus. Mark the task done when YOU decide — or keep the streak going!",
        });
      } else if (mode === "short" || mode === "long") {
        setCelebration({
          title: "Break over! ⚡",
          message: pickCelebration(),
        });
      }
    },
    []
  );

  const pomo = usePomodoro(handlePhaseEnd, pomoKey);

  // Reminder checker: in-app banner for tasks inside their reminder window.
  useEffect(() => {
    if (tasks.length === 0) return;
    const check = () => {
      const now = Date.now();
      const fresh = tasks.filter(
        (t) =>
          isReminderDue(t, now) &&
          t.dueAt &&
          !notifiedRef.current.has(`${t.id}:${t.dueAt}`)
      );
      if (fresh.length === 0) return;
      const notified = notifiedRef.current;
      for (const t of fresh) {
        if (t.dueAt) notified.add(`${t.id}:${t.dueAt}`);
      }
      try {
        localStorage.setItem(notifiedKey, JSON.stringify([...notified]));
      } catch {
        /* ignore */
      }
      setReminders((prev) => {
        const ids = new Set(prev.map((t) => t.id));
        return [...prev, ...fresh.filter((t) => !ids.has(t.id))];
      });
    };
    check();
    const id = setInterval(check, 30000);
    return () => clearInterval(id);
  }, [tasks, notifiedKey]);

  const visibleCategories = useMemo(() => {
    const needle = categoryQ.trim().toLowerCase();
    if (!needle) return categories;
    return categories.filter((c) => c.name.toLowerCase().includes(needle));
  }, [categories, categoryQ]);

  const visibleTasks = useMemo(
    () => filterTasks(tasks, { q, category, priority, status }),
    [tasks, q, category, priority, status]
  );

  const openCount = tasks.filter((t) => t.status === "OPEN").length;
  const doneCount = tasks.filter((t) => t.status === "DONE").length;

  async function submitTask(input: {
    title: string;
    note: string;
    priority: Priority;
    category: string;
    dueAt: string | null;
    remindBefore: RemindBefore;
  }) {
    setSaving(true);
    setFormError("");
    try {
      const res = await fetch(
        editing ? `/api/tasks/${editing.id}` : "/api/tasks",
        {
          method: editing ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error ?? "Could not save task");
        return;
      }
      setFormOpen(false);
      setEditing(null);
      await refresh();
    } catch {
      setFormError("Network error. Try again.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleTask(task: Task) {
    const next = task.status === "DONE" ? "OPEN" : "DONE";
    const res = await fetch(`/api/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    if (!res.ok) return;
    setReminders((prev) => prev.filter((t) => t.id !== task.id));
    await refresh();
    if (next === "DONE") {
      setCelebration({
        title: "Task done! 🎉",
        message: pickCelebration(),
      });
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await fetch(`/api/tasks/${deleteTarget.id}`, { method: "DELETE" });
      setReminders((prev) => prev.filter((t) => t.id !== deleteTarget.id));
      await refresh();
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  }

  function handleFocus(task: Task) {
    pomoTaskRef.current = { id: task.id, title: task.title };
    pomo.startFocus(task.id, task.title);
    setFocusMode(false);
    setTimerOpen(true);
  }

  /** Pausing returns full color; (re)starting a focus phase dims the app. */
  function handleTimerToggle() {
    const wasRunning = pomo.snap.running;
    pomo.toggle();
    setFocusMode(!wasRunning && pomo.snap.mode === "focus");
  }

  /** Start (or restart) the focus session and dim everything else. */
  function handleStartFocusSession() {
    const current = pomoTaskRef.current;
    if (current) pomo.startFocus(current.id, current.title);
    else pomo.toggle();
    setFocusMode(true);
  }

  function handleTimerClose() {
    setFocusMode(false);
    setTimerOpen(false);
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    // True swap semantics: exchange the two tasks' places so a dropped
    // task always lands exactly where the eye expects it.
    const fullOrder = [...tasks]
      .sort((a, b) => a.position - b.position)
      .map((t) => t.id);
    const from = fullOrder.indexOf(String(active.id));
    const to = fullOrder.indexOf(String(over.id));
    if (from === -1 || to === -1) return;
    const next = [...fullOrder];
    [next[from], next[to]] = [next[to], next[from]];
    // Optimistic update for instant feedback.
    setTasks((prev) => {
      const pos = new Map(next.map((id, i) => [id, i]));
      return [...prev].sort(
        (a, b) => (pos.get(a.id) ?? 0) - (pos.get(b.id) ?? 0)
      );
    });
    const res = await fetch("/api/tasks/reorder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderedIds: next }),
    });
    if (!res.ok) await refresh();
  }

  const focusingTaskId = pomo.active ? pomo.snap.taskId : null;

  return (
    <div className="flex min-h-full flex-1 flex-col bg-paper">
      <Header username={username} />

      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-4 px-4 pb-40 pt-4">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-2">
          {[
            ["Open", String(openCount), "bg-forest text-lime"],
            ["Done", String(doneCount), "bg-lime text-forest"],
            ["Total", String(tasks.length), "bg-white text-forest"],
          ].map(([label, value, cls]) => (
            <div
              key={label}
              className={`task-card rounded-3xl border-2 border-forest/10 px-4 py-3 text-center ${cls}`}
            >
              <p className="text-2xl font-bold">{value}</p>
              <p className="text-xs font-bold uppercase tracking-widest opacity-70">
                {label}
              </p>
            </div>
          ))}
        </div>

        {/* Reminders */}
        {reminders.length > 0 ? (
          <div className="pop-in flex flex-col gap-2 rounded-3xl border-2 border-amber-pop/60 bg-amber-pop/15 p-3">
            {reminders.map((t) => (
              <div key={t.id} className="flex items-center gap-2">
                <span className="text-xl" aria-hidden>
                  ⏰
                </span>
                <p className="min-w-0 flex-1 text-sm font-bold text-forest">
                  <span className="line-clamp-1">{t.title}</span>
                  <span className="text-xs font-semibold text-ink/60">
                    {t.dueAt ? `Due ${formatDue(t.dueAt)}` : ""}
                  </span>
                </p>
                <button
                  onClick={() =>
                    setReminders((prev) => prev.filter((r) => r.id !== t.id))
                  }
                  aria-label="Dismiss reminder"
                  className="btn-smooth tap-target rounded-full border-2 border-forest/15 px-3 text-sm font-bold text-forest"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        ) : null}

        {/* Productivity heatmap */}
        <Heatmap tasks={tasks} />

        {/* Search */}
        <div className="task-card rounded-3xl border-2 border-forest/10 bg-white p-3">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="🔎 Search title, note, category…"
            className="field-base tap-target w-full bg-cream"
          />
          <div className="mt-2 flex gap-2">
            <input
              value={categoryQ}
              onChange={(e) => setCategoryQ(e.target.value)}
              placeholder="Filter categories…"
              className="field-base tap-target w-full"
            />
          </div>
          <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
            <button
              onClick={() => setCategory("ALL")}
              className={`btn-smooth tap-target shrink-0 rounded-full px-4 py-2 text-xs font-bold ${
                category === "ALL"
                  ? "bg-forest text-lime"
                  : "bg-cream text-forest"
              }`}
            >
              All ({tasks.length})
            </button>
            {visibleCategories.map((c) => (
              <button
                key={c.name}
                onClick={() => setCategory(c.name)}
                className={`btn-smooth tap-target shrink-0 rounded-full px-4 py-2 text-xs font-bold ${
                  category === c.name
                    ? "bg-forest text-lime"
                    : "bg-cream text-forest"
                }`}
              >
                {c.name} ({c.count})
              </button>
            ))}
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="field-base field-select tap-target text-sm"
              aria-label="Filter by priority"
            >
              <option value="ALL">All priorities</option>
              <option value="LOW">🟢 Low</option>
              <option value="MEDIUM">🟡 Medium</option>
              <option value="HIGH">🔴 High</option>
            </select>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="field-base field-select tap-target text-sm"
              aria-label="Filter by status"
            >
              <option value="OPEN">Open</option>
              <option value="DONE">Done</option>
              <option value="ALL">Open + Done</option>
            </select>
          </div>
        </div>

        {/* List (drag to reorder via the ⋮⋮ handle) */}
        {loading ? (
          <p className="py-10 text-center font-bold text-forest/60">
            Loading your tasks…
          </p>
        ) : visibleTasks.length === 0 ? (
          <div className="card-in rounded-3xl border-2 border-dashed border-forest/20 bg-white p-8 text-center">
            <p className="text-4xl">🌱</p>
            <p className="mt-2 font-bold text-forest">Nothing here yet</p>
            <p className="mt-1 text-sm text-ink/60">
              {tasks.length === 0
                ? "Add your first task and start moving."
                : "Try clearing search or filters."}
            </p>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={visibleTasks.map((t) => t.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="tunnel-mask flex flex-col gap-3 pb-4">
                {visibleTasks.map((t, i) => (
                  <SortableTaskItem
                    key={t.id}
                    task={t}
                    index={i}
                    focusActive={focusingTaskId === t.id}
                    onToggle={toggleTask}
                    onEdit={(task) => {
                      setEditing(task);
                      setFormError("");
                      setFormOpen(true);
                    }}
                    onDelete={setDeleteTarget}
                    onFocus={handleFocus}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </main>

      {/* Sticky glass CTA: tasks visibly slide underneath while scrolling */}
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 px-4 pb-safe pt-8">
        <div className="mx-auto flex max-w-xl flex-col gap-2 pb-8">
          <PomodoroDock pomo={pomo} onExpand={() => setTimerOpen(true)} />
          <button
            onClick={() => {
              setEditing(null);
              setFormError("");
              setFormOpen(true);
            }}
            className="glass-cta btn-smooth pointer-events-auto tap-target w-full rounded-2xl px-5 py-4 text-base font-bold text-forest shadow-[0_6px_24px_rgba(22,51,0,0.35)]"
          >
            + New task
          </button>
        </div>
      </div>

      <TaskForm
        open={formOpen}
        initial={editing}
        saving={saving}
        error={formError}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        onSubmit={submitTask}
      />

      {timerOpen && pomo.active ? (
        <PomodoroTimer
          pomo={pomo}
          focusMode={focusMode}
          onClose={handleTimerClose}
          onToggleTimer={handleTimerToggle}
          onStartFocusSession={handleStartFocusSession}
        />
      ) : null}

      {/* Focus dimmer: greys out the whole interface except the timer box.
          Always mounted so entering AND leaving animate smoothly. */}
      <div
        aria-hidden
        data-testid="focus-dimmer"
        className={`pointer-events-none fixed inset-0 z-30 bg-forest-deep/70 backdrop-blur-[3px] backdrop-grayscale transition-all duration-700 ease-out ${
          focusMode ? "opacity-100" : "opacity-0"
        }`}
      />

      <DeleteDialog
        open={!!deleteTarget}
        taskTitle={deleteTarget?.title ?? ""}
        deleting={deleting}
        onCancel={() => {
          if (!deleting) setDeleteTarget(null);
        }}
        onConfirm={confirmDelete}
      />

      <CelebrationModal
        open={!!celebration}
        title={celebration?.title ?? ""}
        message={celebration?.message ?? ""}
        onClose={() => setCelebration(null)}
      />
    </div>
  );
}
