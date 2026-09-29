"use client";

import { useMemo, useState } from "react";
import {
  bestDay,
  buildHeatmap,
  computeStreak,
  totalCompletions,
  type HeatDay,
} from "@/lib/stats";
import type { Task } from "@/lib/types";

const LEVEL_BG: Record<number, string> = {
  0: "bg-paper/15",
  1: "bg-lime/30",
  2: "bg-lime/55",
  3: "bg-lime/80",
  4: "bg-lime",
};

function monthLabel(date: Date): string {
  return date.toLocaleDateString(undefined, { month: "short" });
}

function fullLabel(cell: HeatDay): string {
  const date = cell.date.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  return `${cell.count} task${cell.count === 1 ? "" : "s"} done · ${date}`;
}

/** GitHub-style productivity heatmap in SupaDupa forest/lime. */
export default function Heatmap({ tasks }: { tasks: Task[] }) {
  const [open, setOpen] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try {
      return localStorage.getItem("taskady-heat-open") === "1";
    } catch {
      return false;
    }
  });
  const cells = useMemo(() => buildHeatmap(tasks, 91), [tasks]);
  const streak = useMemo(() => computeStreak(tasks), [tasks]);
  const total = useMemo(() => totalCompletions(tasks), [tasks]);
  const best = useMemo(() => bestDay(cells), [cells]);

  // Group oldest→newest days into week columns (Mon..Sun).
  const weeks = useMemo(() => {
    const cols: (HeatDay | null)[][] = [];
    let col: (HeatDay | null)[] = [];
    // Pad the first column so weeks always start on Monday.
    const firstDow = (cells[0]?.date.getDay() ?? 1) || 7; // Mon=1..Sun=7
    for (let i = 1; i < firstDow; i++) col.push(null);
    for (const c of cells) {
      col.push(c);
      if (col.length === 7) {
        cols.push(col);
        col = [];
      }
    }
    if (col.length > 0) {
      while (col.length < 7) col.push(null);
      cols.push(col);
    }
    return cols;
  }, [cells]);

  const monthMarks = useMemo(() => {
    const marks: { col: number; label: string }[] = [];
    let prev = "";
    weeks.forEach((colDays, i) => {
      const first = colDays.find((d) => d !== null);
      if (!first) return;
      const label = monthLabel(first.date);
      if (label !== prev) {
        marks.push({ col: i, label });
        prev = label;
      }
    });
    return marks;
  }, [weeks]);

  function toggle() {
    setOpen((o) => {
      try {
        localStorage.setItem("taskady-heat-open", o ? "0" : "1");
      } catch {
        /* ignore */
      }
      return !o;
    });
  }

  return (
    <section
      aria-label="Productivity heatmap"
      className="task-card rounded-3xl border-2 border-forest/10 bg-forest p-4 text-paper"
    >
      <button
        onClick={toggle}
        aria-expanded={open}
        aria-label={open ? "Collapse heatmap" : "Expand heatmap"}
        className="btn-smooth flex min-h-[44px] w-full items-center justify-between gap-2 text-left"
      >
        <span className="text-base font-bold">🔥 Your momentum</span>
        <span className="flex items-center gap-2">
          <span className="text-xs font-bold text-lime">
            {streak > 0 ? `${streak}-day streak` : "Start your streak"}
          </span>
          <span
            aria-hidden
            className={`grid h-8 w-8 place-items-center rounded-full bg-paper/15 text-paper transition-transform duration-300 ${
              open ? "rotate-180" : ""
            }`}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m4 6 4 4 4-4" />
            </svg>
          </span>
        </span>
      </button>

      <div
        className={`grid transition-all duration-300 ease-out ${
          open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden">
          <div className="pt-3">
      <div className="overflow-x-auto pb-1">
        <div className="inline-block min-w-full">
          <div
            className="relative grid auto-cols-[12px] grid-flow-col gap-[3px]"
            role="img"
            aria-label={`${total} tasks completed in the last 13 weeks, ${streak}-day streak`}
          >
            {monthMarks.map((m) => (
              <span
                key={`${m.col}-${m.label}`}
                className="absolute -top-0 text-[10px] font-bold text-paper/50"
                style={{
                  left: `${m.col * 15}px`,
                  transform: "translateY(-100%)",
                }}
              >
                {m.label}
              </span>
            ))}
            {weeks.map((colDays, wi) => (
              <div key={wi} className="grid grid-rows-7 gap-[3px]">
                {colDays.map((cell, di) =>
                  cell === null ? (
                    <span key={di} className="h-3 w-3" />
                  ) : (
                    <span
                      key={di}
                      title={fullLabel(cell)}
                      data-testid={cell.isToday ? "heat-today" : undefined}
                      data-count={cell.isToday ? cell.count : undefined}
                      className={`h-3 w-3 rounded-[4px] transition-transform duration-150 hover:scale-125 ${LEVEL_BG[cell.level]} ${
                        cell.isToday ? "outline outline-1 outline-lime" : ""
                      }`}
                    />
                  )
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-2 text-xs font-semibold">
        <p className="text-paper/70">
          ✅ {total} done ·{" "}
          {best
            ? `🏆 best ${best.date.toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
              })} (${best.count})`
            : "🏆 no best day yet"}
        </p>
        <p className="flex shrink-0 items-center gap-1 text-paper/50">
          Less
          {[0, 1, 2, 3, 4].map((l) => (
            <span
              key={l}
              className={`h-2.5 w-2.5 rounded-[3px] ${LEVEL_BG[l]}`}
            />
          ))}
          More
        </p>
      </div>
          </div>
        </div>
      </div>
    </section>
  );
}
