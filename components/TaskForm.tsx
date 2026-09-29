"use client";

import { useEffect, useState } from "react";
import {
  PRIORITY_META,
  REMINDER_OPTIONS,
  type Priority,
  type RemindBefore,
  type Task,
} from "@/lib/types";
import { CATEGORY_OPTIONS } from "@/lib/validations";
import { fromLocalInputValue, toLocalInputValue } from "@/lib/reminders";

interface Props {
  open: boolean;
  initial?: Task | null;
  saving: boolean;
  error: string;
  onClose: () => void;
  onSubmit: (input: {
    title: string;
    note: string;
    priority: Priority;
    category: string;
    dueAt: string | null;
    remindBefore: RemindBefore;
  }) => void;
}

const PRIORITIES: Priority[] = ["LOW", "MEDIUM", "HIGH"];

export default function TaskForm({
  open,
  initial,
  saving,
  error,
  onClose,
  onSubmit,
}: Props) {
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [priority, setPriority] = useState<Priority>("MEDIUM");
  const [category, setCategory] = useState<string>("General");
  const [dueInput, setDueInput] = useState("");
  const [remindBefore, setRemindBefore] = useState<RemindBefore>("NONE");

  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reset form fields each time the sheet opens
      setTitle(initial?.title ?? "");
      setNote(initial?.note ?? "");
      setPriority(initial?.priority ?? "MEDIUM");
      setCategory(
        (CATEGORY_OPTIONS as readonly string[]).includes(initial?.category ?? "")
          ? (initial?.category as string)
          : "General"
      );
      setDueInput(toLocalInputValue(initial?.dueAt ?? null));
      setRemindBefore(initial?.remindBefore ?? "NONE");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open ]);

  if (!open) return null;

  return (
    <div className="overlay-in fixed inset-0 z-40 flex items-end justify-center bg-forest/60 p-0 sm:items-center sm:p-4">
      <div className="sheet-up max-h-[92dvh] w-full max-w-xl overflow-y-auto rounded-t-3xl bg-paper p-5 pb-safe sm:rounded-3xl">
        <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-smoke sm:hidden" />
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-forest">
            {initial ? "Edit task" : "New task"}
          </h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="btn-smooth tap-target rounded-full border-2 border-forest/15 px-3 font-bold text-forest"
          >
            ✕
          </button>
        </div>

        <form
          className="mt-4 flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
          onSubmit({
              title: title.trim(),
              note: note.trim(),
              priority,
              category,
              dueAt: fromLocalInputValue(dueInput),
              remindBefore,
            });
          }}
        >
          <label className="flex flex-col gap-1 text-sm font-bold text-forest">
            Title *
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What needs moving?"
              maxLength={120}
              className="field-base tap-target"
            />
          </label>

          <label className="text-sm font-bold text-forest">
            Note <span className="font-medium text-ink/50">(optional)</span>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Context, links, next step…"
              rows={3}
              maxLength={1000}
              className="field-base mt-1 w-full py-3"
            />
          </label>

          <fieldset>
            <legend className="text-sm font-bold text-forest">Priority</legend>
            <div className="mt-1 grid grid-cols-3 gap-2">
              {PRIORITIES.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPriority(p)}
                  aria-pressed={priority === p}
                  className={`btn-smooth tap-target flex items-center justify-center gap-2 rounded-2xl border-2 px-2 py-2 text-sm font-bold ${
                    priority === p
                      ? "border-forest bg-forest text-lime"
                      : "border-forest/15 bg-white text-forest"
                  }`}
                >
                  <span
                    className={`h-3 w-3 rounded-full ${PRIORITY_META[p].dot} border border-forest/30`}
                  />
                  {PRIORITY_META[p].label}
                </button>
              ))}
            </div>
          </fieldset>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="text-sm font-bold text-forest">
              Category
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="field-base field-select tap-target mt-1 w-full"
              >
                {CATEGORY_OPTIONS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm font-bold text-forest">
              Reminder <span className="font-medium text-ink/50">(optional)</span>
              <select
                value={remindBefore}
                onChange={(e) => setRemindBefore(e.target.value as RemindBefore)}
                className="field-base field-select tap-target mt-1 w-full"
              >
                {REMINDER_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="text-sm font-bold text-forest">
            Due date & time{" "}
            <span className="font-medium text-ink/50">(optional)</span>
            <input
              type="datetime-local"
              value={dueInput}
              onChange={(e) => setDueInput(e.target.value)}
              className="field-base tap-target mt-1 w-full"
            />
          </label>

          {error ? (
            <p className="rounded-2xl bg-coral-pop/15 px-4 py-2 text-sm font-semibold text-forest">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={saving || !title.trim()}
            className="btn-smooth tap-target rounded-2xl bg-lime px-4 py-3 text-base font-bold text-forest shadow-[0_3px_0_#163300] disabled:opacity-50"
          >
            {saving ? "Saving…" : initial ? "Save changes" : "Add task"}
          </button>
          <div aria-hidden className="h-3" />
        </form>
      </div>
    </div>
  );
}
