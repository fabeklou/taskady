import bcrypt from "bcryptjs";
import { createHash, randomUUID } from "crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import type { RemindBefore, Task } from "./types";

const ALLOWED_CATEGORIES = ["General", "Personal", "Professional"];

interface UserRecord {
  id: string;
  username: string;
  passwordHash: string;
  createdAt: string;
}

interface DbShape {
  users: UserRecord[];
  tasks: Task[];
}

const DEMO_USERNAME = process.env.DEMO_USERNAME || "demo";
const DEMO_PASSWORD = process.env.DEMO_PASSWORD || "demo1234";

function dbPath(): string {
  if (process.env.TASKADY_DB_PATH) return process.env.TASKADY_DB_PATH;
  // Vercel serverless filesystem is read-only except /tmp.
  if (process.env.VERCEL) return "/tmp/taskady-db.json";
  return join(process.cwd(), ".data", "db.json");
}

let memoryFallback: DbShape | null = null;

function blankDb(): DbShape {
  return { users: [], tasks: [] };
}

function seedDb(db: DbShape): DbShape {
  if (db.users.some((u) => u.username === DEMO_USERNAME)) return db;
  const now = new Date().toISOString();
  // Stable id: every serverless instance seeds its own /tmp copy, so a
  // random id here would make a session minted on instance A unknown on
  // instance B — the browser then loops /dashboard <-> /login on a blank page.
  const demoId = createHash("sha256")
    .update(`taskady-demo-user:${DEMO_USERNAME}`)
    .digest("hex");
  db.users.push({
    id: demoId,
    username: DEMO_USERNAME,
    passwordHash: bcrypt.hashSync(DEMO_PASSWORD, 10),
    createdAt: now,
  });
  const samples: Array<Pick<Task, "title" | "note" | "priority" | "category">> =
    [
      {
        title: "Try a 25-minute focus session",
        note: "Open this task, tap Focus, finish one pomodoro.",
        priority: "MEDIUM",
        category: "General",
      },
      {
        title: "Create your first real task",
        note: "Add a note, pick a priority and a category.",
        priority: "LOW",
        category: "Personal",
      },
      {
        title: "Finish one task today",
        note: "",
        priority: "HIGH",
        category: "Professional",
      },
    ];
  for (const [i, s] of samples.entries()) {
    db.tasks.push({
      id: randomUUID(),
      userId: demoId,
      title: s.title,
      note: s.note,
      priority: s.priority,
      category: s.category,
      status: "OPEN",
      pomodoros: 0,
      completedAt: null,
      dueAt: null,
      remindBefore: "NONE",
      position: i,
      createdAt: now,
      updatedAt: now,
    });
  }
  return db;
}

/**
 * Backfill defaults for tasks created before newer fields existed.
 * Keeps old local data working after upgrades.
 */
function normalizeTask(raw: Task, index: number): Task {
  return {
    ...raw,
    category: ALLOWED_CATEGORIES.includes(raw.category)
      ? raw.category
      : "General",
    dueAt: raw.dueAt ?? null,
    remindBefore: (raw.remindBefore ?? "NONE") as RemindBefore,
    completedAt: raw.completedAt ?? null,
    position:
      typeof raw.position === "number" && Number.isFinite(raw.position)
        ? raw.position
        : index,
  };
}

function normalizeDb(db: DbShape): DbShape {
  db.tasks = db.tasks.map(normalizeTask);
  return db;
}

export function readDb(): DbShape {
  if (memoryFallback) return memoryFallback;
  const path = dbPath();
  try {
    if (!existsSync(path)) {
      const seeded = seedDb(blankDb());
      persistDb(seeded);
      return seeded;
    }
    const raw = readFileSync(path, "utf8");
    const parsed = JSON.parse(raw) as DbShape;
    const db: DbShape = {
      users: Array.isArray(parsed.users) ? parsed.users : [],
      tasks: Array.isArray(parsed.tasks) ? parsed.tasks : [],
    };
    return seedDb(normalizeDb(db));
  } catch {
    if (!memoryFallback) memoryFallback = seedDb(blankDb());
    return memoryFallback;
  }
}

function persistDb(db: DbShape): void {
  if (memoryFallback) {
    memoryFallback = db;
    return;
  }
  try {
    const path = dbPath();
    mkdirSync(join(path, ".."), { recursive: true });
    // Make the mkdir above robust for absolute paths:
    const dir = path.slice(0, path.lastIndexOf("/"));
    if (dir) mkdirSync(dir, { recursive: true });
    writeFileSync(path, JSON.stringify(db, null, 2), "utf8");
  } catch {
    memoryFallback = db;
  }
}

export function writeDb(db: DbShape): void {
  persistDb(db);
}

// ---- Users (always scoped, never leak hashes) ----

export function findUserByUsername(username: string): UserRecord | undefined {
  const db = readDb();
  return db.users.find(
    (u) => u.username.toLowerCase() === username.toLowerCase()
  );
}

export function findUserById(id: string): UserRecord | undefined {
  return readDb().users.find((u) => u.id === id);
}

export function createUser(username: string, passwordHash: string): UserRecord {
  const db = readDb();
  const user: UserRecord = {
    id: randomUUID(),
    username,
    passwordHash,
    createdAt: new Date().toISOString(),
  };
  db.users.push(user);
  writeDb(db);
  return user;
}

// ---- Tasks (every query MUST scope by userId) ----

export function listTasksForUser(userId: string): Task[] {
  return readDb()
    .tasks.filter((t) => t.userId === userId)
    .sort(
      (a, b) => a.position - b.position || a.createdAt.localeCompare(b.createdAt)
    );
}

export function getTaskForUser(id: string, userId: string): Task | undefined {
  return readDb().tasks.find((t) => t.id === id && t.userId === userId);
}

export function createTaskForUser(
  userId: string,
  input: {
    title: string;
    note: string;
    priority: Task["priority"];
    category: string;
    dueAt?: string | null;
    remindBefore?: RemindBefore;
  }
): Task {
  const db = readDb();
  const now = new Date().toISOString();
  const maxPosition = db.tasks
    .filter((t) => t.userId === userId)
    .reduce((max, t) => Math.max(max, t.position ?? -1), -1);
  const task: Task = {
    id: randomUUID(),
    userId,
    title: input.title,
    note: input.note ?? "",
    priority: input.priority,
    category: input.category || "General",
    status: "OPEN",
    pomodoros: 0,
    completedAt: null,
    dueAt: input.dueAt ?? null,
    remindBefore: input.remindBefore ?? "NONE",
    position: maxPosition + 1,
    createdAt: now,
    updatedAt: now,
  };
  db.tasks.push(task);
  writeDb(db);
  return task;
}

export function updateTaskForUser(
  id: string,
  userId: string,
  patch: Partial<
    Pick<
      Task,
      | "title"
      | "note"
      | "priority"
      | "category"
      | "status"
      | "dueAt"
      | "remindBefore"
      | "position"
    >
  > & {
    incrementPomodoro?: boolean;
  }
): Task | undefined {
  const db = readDb();
  const task = db.tasks.find((t) => t.id === id && t.userId === userId);
  if (!task) return undefined;
  if (patch.title !== undefined) task.title = patch.title;
  if (patch.note !== undefined) task.note = patch.note;
  if (patch.priority !== undefined) task.priority = patch.priority;
  if (patch.category !== undefined) task.category = patch.category || "General";
  if (patch.status !== undefined) {
    // completedAt is server-side only: stamped on DONE, cleared on reopen.
    if (patch.status === "DONE" && task.status !== "DONE") {
      task.completedAt = new Date().toISOString();
    } else if (patch.status === "OPEN") {
      task.completedAt = null;
    }
    task.status = patch.status;
  }
  if (patch.dueAt !== undefined) task.dueAt = patch.dueAt;
  if (patch.remindBefore !== undefined) task.remindBefore = patch.remindBefore;
  if (patch.position !== undefined) task.position = patch.position;
  if (patch.incrementPomodoro) task.pomodoros += 1;
  task.updatedAt = new Date().toISOString();
  writeDb(db);
  return task;
}

/**
 * Persist a full manual ordering. Every id must belong to the user,
 * otherwise nothing is written (all-or-nothing).
 */
export function reorderTasksForUser(
  userId: string,
  orderedIds: string[]
): boolean {
  const db = readDb();
  const owned = new Set(
    db.tasks.filter((t) => t.userId === userId).map((t) => t.id)
  );
  if (!orderedIds.every((id) => owned.has(id))) return false;
  const positionOf = new Map(orderedIds.map((id, i) => [id, i]));
  for (const task of db.tasks) {
    if (task.userId !== userId) continue;
    const pos = positionOf.get(task.id);
    if (pos !== undefined) {
      task.position = pos;
      task.updatedAt = new Date().toISOString();
    }
  }
  writeDb(db);
  return true;
}

export function deleteTaskForUser(id: string, userId: string): boolean {
  const db = readDb();
  const idx = db.tasks.findIndex((t) => t.id === id && t.userId === userId);
  if (idx === -1) return false;
  db.tasks.splice(idx, 1);
  writeDb(db);
  return true;
}

export function categoriesForUser(userId: string): { name: string; count: number }[] {
  const map = new Map<string, number>();
  for (const t of readDb().tasks) {
    if (t.userId !== userId) continue;
    map.set(t.category, (map.get(t.category) ?? 0) + 1);
  }
  return [...map.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => a.name.localeCompare(b.name));
}
