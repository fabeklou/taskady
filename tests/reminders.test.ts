import { describe, expect, it } from "vitest";
import {
  fromLocalInputValue,
  isDueSoon,
  isOverdue,
  isReminderDue,
  toLocalInputValue,
} from "@/lib/reminders";
import type { Task } from "@/lib/types";

function makeTask(over: Partial<Task> = {}): Task {
  return {
    id: "t1",
    userId: "u1",
    title: "Dated task",
    note: "",
    priority: "MEDIUM",
    category: "Work",
    status: "OPEN",
    pomodoros: 0,
    completedAt: null,
    dueAt: null,
    remindBefore: "NONE",
    position: 0,
    createdAt: "2026-09-29T00:00:00.000Z",
    updatedAt: "2026-09-29T00:00:00.000Z",
    ...over,
  };
}

const NOW = new Date("2026-09-29T12:00:00.000Z").getTime();

describe("isReminderDue", () => {
  it("fires inside the reminder window only", () => {
    // due 13:00, reminder 1H → window [12:00, 13:00]
    const t = makeTask({
      dueAt: "2026-09-29T13:00:00.000Z",
      remindBefore: "1H",
    });
    expect(isReminderDue(t, NOW)).toBe(true);
    expect(isReminderDue(t, NOW - 1000)).toBe(false); // 1s too early
    expect(isReminderDue(t, NOW + 60 * 60 * 1000 + 1)).toBe(false); // past due
  });

  it("supports the day/3h options and ignores DONE tasks", () => {
    const day = makeTask({
      dueAt: "2026-09-30T11:00:00.000Z",
      remindBefore: "DAY",
    });
    expect(isReminderDue(day, NOW)).toBe(true); // 23h before, inside 24h window
    const done = makeTask({
      status: "DONE",
      dueAt: "2026-09-29T13:00:00.000Z",
      remindBefore: "1H",
    });
    expect(isReminderDue(done, NOW)).toBe(false);
    const none = makeTask({ dueAt: "2026-09-29T13:00:00.000Z" });
    expect(isReminderDue(none, NOW)).toBe(false);
  });
});

describe("isOverdue / isDueSoon", () => {
  it("flags overdue open tasks", () => {
    expect(
      isOverdue(makeTask({ dueAt: "2026-09-29T11:00:00.000Z" }), NOW)
    ).toBe(true);
    expect(
      isOverdue(
        makeTask({ dueAt: "2026-09-29T11:00:00.000Z", status: "DONE" }),
        NOW
      )
    ).toBe(false);
    expect(isOverdue(makeTask(), NOW)).toBe(false);
  });

  it("flags tasks due within 24h", () => {
    expect(
      isDueSoon(makeTask({ dueAt: "2026-09-30T11:00:00.000Z" }), NOW)
    ).toBe(true);
    expect(
      isDueSoon(makeTask({ dueAt: "2026-10-05T11:00:00.000Z" }), NOW)
    ).toBe(false);
  });
});

describe("datetime-local conversions", () => {
  it("round-trips through the form input", () => {
    const iso = "2026-09-29T12:00:00.000Z";
    const input = toLocalInputValue(iso);
    expect(input).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
    const back = fromLocalInputValue(input);
    expect(back).not.toBeNull();
    expect(Math.abs(Date.parse(back as string) - Date.parse(iso))).toBeLessThan(
      60 * 1000
    );
    expect(fromLocalInputValue("")).toBeNull();
    expect(toLocalInputValue(null)).toBe("");
  });
});
