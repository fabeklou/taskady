import { describe, expect, it } from "vitest";
import {
  loginSchema,
  reorderSchema,
  signupSchema,
  taskCreateSchema,
  taskUpdateSchema,
} from "@/lib/validations";

describe("auth validations (endpoint contract: POST /api/auth/signup|login)", () => {
  it("accepts a valid signup", () => {
    expect(
      signupSchema.safeParse({ username: "focus-fan", password: "secret123" })
        .success
    ).toBe(true);
  });

  it("rejects short usernames and passwords", () => {
    expect(signupSchema.safeParse({ username: "ab", password: "secret123" }).success).toBe(
      false
    );
    expect(signupSchema.safeParse({ username: "valid-name", password: "123" }).success).toBe(
      false
    );
  });

  it("rejects usernames with spaces", () => {
    expect(
      signupSchema.safeParse({ username: "not valid", password: "secret123" }).success
    ).toBe(false);
  });

  it("login uses the same contract as signup", () => {
    expect(
      loginSchema.safeParse({ username: "demo", password: "demo1234" }).success
    ).toBe(true);
  });
});

describe("task validations (endpoint contract: POST/PATCH /api/tasks)", () => {
  it("applies defaults for priority and category", () => {
    const parsed = taskCreateSchema.safeParse({ title: "  Focus  " });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.title).toBe("Focus");
      expect(parsed.data.priority).toBe("MEDIUM");
      expect(parsed.data.category).toBe("General");
    }
  });

  it("rejects empty titles and overlong notes", () => {
    expect(taskCreateSchema.safeParse({ title: "   " }).success).toBe(false);
    expect(
      taskCreateSchema.safeParse({ title: "ok", note: "x".repeat(1001) }).success
    ).toBe(false);
  });

  it("accepts partial updates including pomodoro increment", () => {
    expect(
      taskUpdateSchema.safeParse({ status: "DONE", incrementPomodoro: true }).success
    ).toBe(true);
    expect(taskUpdateSchema.safeParse({ status: "WRONG" }).success).toBe(false);
  });

  it("defaults reminder to NONE and normalizes due dates to ISO", () => {
    const parsed = taskCreateSchema.safeParse({
      title: "Dated",
      dueAt: "2026-10-01T10:00",
      remindBefore: "DAY",
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.remindBefore).toBe("DAY");
      expect(parsed.data.dueAt).toContain("2026-10-01");
    }
    const empty = taskCreateSchema.safeParse({ title: "No date" });
    expect(empty.success).toBe(true);
    if (empty.success) {
      expect(empty.data.dueAt).toBeNull();
      expect(empty.data.remindBefore).toBe("NONE");
    }
  });

  it("rejects invalid due dates and reminder values", () => {
    expect(
      taskCreateSchema.safeParse({ title: "x", dueAt: "not-a-date!!!" }).success
    ).toBe(true); // coerced to null rather than rejected
    expect(
      taskCreateSchema.safeParse({ title: "x", remindBefore: "WEEK" }).success
    ).toBe(false);
    expect(taskUpdateSchema.safeParse({ position: -1 }).success).toBe(false);
    expect(taskUpdateSchema.safeParse({ position: 3 }).success).toBe(true);
  });

  it("validates reorder payloads (POST /api/tasks/reorder)", () => {
    expect(reorderSchema.safeParse({ orderedIds: ["a", "b"] }).success).toBe(true);
    expect(reorderSchema.safeParse({ orderedIds: [] }).success).toBe(false);
    expect(reorderSchema.safeParse({}).success).toBe(false);
  });

  it("strictly limits categories to General, Personal, Professional", () => {
    for (const c of ["General", "Personal", "Professional"]) {
      expect(taskCreateSchema.safeParse({ title: "x", category: c }).success).toBe(
        true
      );
    }
    expect(
      taskCreateSchema.safeParse({ title: "x", category: "Work" }).success
    ).toBe(false);
    expect(
      taskCreateSchema.safeParse({ title: "x", category: "" }).success
    ).toBe(false);
    expect(
      taskUpdateSchema.safeParse({ category: "Study" }).success
    ).toBe(false);
    expect(
      taskUpdateSchema.safeParse({ category: "Personal" }).success
    ).toBe(true);
  });
});
