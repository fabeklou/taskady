import { join } from "path";
import { tmpdir } from "os";
import { describe, expect, it, beforeEach } from "vitest";

/**
 * Endpoint-adjacent contract tests: every task operation MUST scope by userId.
 * Uses an isolated temp DB file so tests never touch real data.
 */
const TEST_DB = join(tmpdir(), `taskady-test-${process.pid}.json`);

process.env.TASKADY_DB_PATH = TEST_DB;

async function freshStore() {
  try {
    const { rmSync } = await import("fs");
    rmSync(TEST_DB, { force: true });
  } catch {
    /* ignore */
  }
  const store = await import("@/lib/store");
  return store;
}

describe("per-user data isolation (contract for /api/tasks*)", () => {
  beforeEach(async () => {
    await freshStore();
  });

  it("users only see their own tasks", async () => {
    const store = await import("@/lib/store");
    const alice = store.createUser("alice-test", "hash");
    const bob = store.createUser("bob-test", "hash");

    store.createTaskForUser(alice.id, {
      title: "Alice task",
      note: "",
      priority: "HIGH",
      category: "Professional",
    });
    store.createTaskForUser(bob.id, {
      title: "Bob task",
      note: "",
      priority: "LOW",
      category: "Personal",
    });

    expect(store.listTasksForUser(alice.id).map((t) => t.title)).toEqual([
      "Alice task",
    ]);
    expect(store.listTasksForUser(bob.id).map((t) => t.title)).toEqual([
      "Bob task",
    ]);
  });

  it("cannot read/update/delete another user's task", async () => {
    const store = await import("@/lib/store");
    const alice = store.createUser("alice2", "hash");
    const bob = store.createUser("bob2", "hash");
    const task = store.createTaskForUser(alice.id, {
      title: "Secret",
      note: "",
      priority: "MEDIUM",
      category: "General",
    });

    expect(store.getTaskForUser(task.id, bob.id)).toBeUndefined();
    expect(
      store.updateTaskForUser(task.id, bob.id, { status: "DONE" })
    ).toBeUndefined();
    expect(store.deleteTaskForUser(task.id, bob.id)).toBe(false);
    // Owner still has it
    expect(store.getTaskForUser(task.id, alice.id)?.title).toBe("Secret");
  });

  it("seeds the demo test account", async () => {
    const store = await import("@/lib/store");
    const demo = store.findUserByUsername(process.env.DEMO_USERNAME || "demo");
    expect(demo).toBeDefined();
    expect(store.listTasksForUser(demo!.id).length).toBeGreaterThan(0);
  });

  it("assigns incremental positions and reorders per user", async () => {
    const store = await import("@/lib/store");
    const alice = store.createUser("alice3", "hash");
    const a = store.createTaskForUser(alice.id, {
      title: "First",
      note: "",
      priority: "LOW",
      category: "General",
    });
    const b = store.createTaskForUser(alice.id, {
      title: "Second",
      note: "",
      priority: "LOW",
      category: "General",
    });
    expect(a.position).toBeLessThan(b.position);
    expect(store.listTasksForUser(alice.id).map((t) => t.id)).toEqual([a.id, b.id]);

    expect(store.reorderTasksForUser(alice.id, [b.id, a.id])).toBe(true);
    expect(store.listTasksForUser(alice.id).map((t) => t.id)).toEqual([b.id, a.id]);
  });

  it("refuses reorder with foreign ids (all-or-nothing)", async () => {
    const store = await import("@/lib/store");
    const alice = store.createUser("alice4", "hash");
    const bob = store.createUser("bob4", "hash");
    const a = store.createTaskForUser(alice.id, {
      title: "A",
      note: "",
      priority: "LOW",
      category: "General",
    });
    const b = store.createTaskForUser(bob.id, {
      title: "B",
      note: "",
      priority: "LOW",
      category: "General",
    });
    expect(store.reorderTasksForUser(alice.id, [b.id, a.id])).toBe(false);
    expect(store.listTasksForUser(alice.id).map((t) => t.id)).toEqual([a.id]);
  });
});
