import bcrypt from "bcryptjs";
import { createHash, randomUUID } from "crypto";
import { Prisma, PrismaClient } from "@prisma/client";
import type { RemindBefore, Task } from "./types";

const DEMO_USERNAME = process.env.DEMO_USERNAME || "demo";
const DEMO_PASSWORD = process.env.DEMO_PASSWORD || "demo1234";

// One client per serverless instance (globalThis guard for dev hot-reload).
// Constructed only when this backend is actually selected: in file-db mode
// DATABASE_URL is unset and this module must stay completely inert.
const globalForPrisma = globalThis as unknown as {
  taskadyPrisma?: PrismaClient;
};
function getPrisma(): PrismaClient {
  if (!globalForPrisma.taskadyPrisma) {
    globalForPrisma.taskadyPrisma = new PrismaClient();
  }
  return globalForPrisma.taskadyPrisma;
}
const prisma: PrismaClient = process.env.DATABASE_URL
  ? getPrisma()
  : (null as unknown as PrismaClient);

interface UserRecord {
  id: string;
  username: string;
  passwordHash: string;
  createdAt: string;
}

type DbTask = {
  id: string;
  userId: string;
  title: string;
  note: string;
  priority: string;
  category: string;
  status: string;
  pomodoros: number;
  completedAt: string | null;
  dueAt: string | null;
  remindBefore: string;
  position: number;
  createdAt: string;
  updatedAt: string;
};

function toTask(t: DbTask): Task {
  return {
    id: t.id,
    userId: t.userId,
    title: t.title,
    note: t.note,
    priority: t.priority as Task["priority"],
    category: t.category,
    status: t.status as Task["status"],
    pomodoros: t.pomodoros,
    completedAt: t.completedAt,
    dueAt: t.dueAt,
    remindBefore: t.remindBefore as RemindBefore,
    position: t.position,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
  };
}

/**
 * Stable demo id: every serverless instance seeds its own copy, so a random
 * id here would make a session minted on instance A unknown on instance B.
 */
function demoUserId(): string {
  return createHash("sha256")
    .update(`taskady-demo-user:${DEMO_USERNAME}`)
    .digest("hex");
}

const DEMO_SAMPLES: Array<{
  title: string;
  note: string;
  priority: Task["priority"];
  category: string;
}> = [
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

let seeded = false;

async function ensureSeeded(): Promise<void> {
  if (seeded) return;
  const existing = await prisma.user.findFirst({
    where: { username: { equals: DEMO_USERNAME, mode: "insensitive" } },
    select: { id: true },
  });
  if (!existing) {
    const now = new Date().toISOString();
    try {
      await prisma.user.create({
        data: {
          id: demoUserId(),
          username: DEMO_USERNAME,
          passwordHash: bcrypt.hashSync(DEMO_PASSWORD, 10),
          createdAt: now,
          tasks: {
            create: DEMO_SAMPLES.map((s, i) => ({
              id: randomUUID(),
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
            })),
          },
        },
      });
    } catch (e) {
      // Lost a cold-start race with another instance — it seeded instead.
      if (
        !(
          e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002"
        )
      ) {
        throw e;
      }
    }
  }
  seeded = true;
}

// ---- Users (always scoped, never leak hashes) ----

export async function findUserByUsername(
  username: string
): Promise<UserRecord | undefined> {
  await ensureSeeded();
  const u = await prisma.user.findFirst({
    where: { username: { equals: username, mode: "insensitive" } },
  });
  if (!u) return undefined;
  return {
    id: u.id,
    username: u.username,
    passwordHash: u.passwordHash,
    createdAt: u.createdAt,
  };
}

export async function findUserById(
  id: string
): Promise<UserRecord | undefined> {
  await ensureSeeded();
  const u = await prisma.user.findUnique({ where: { id } });
  if (!u) return undefined;
  return {
    id: u.id,
    username: u.username,
    passwordHash: u.passwordHash,
    createdAt: u.createdAt,
  };
}

export async function createUser(
  username: string,
  passwordHash: string
): Promise<UserRecord> {
  await ensureSeeded();
  const u = await prisma.user.create({
    data: {
      id: randomUUID(),
      username,
      passwordHash,
      createdAt: new Date().toISOString(),
    },
  });
  return {
    id: u.id,
    username: u.username,
    passwordHash: u.passwordHash,
    createdAt: u.createdAt,
  };
}

// ---- Tasks (every query MUST scope by userId) ----

export async function listTasksForUser(userId: string): Promise<Task[]> {
  await ensureSeeded();
  const rows = await prisma.task.findMany({
    where: { userId },
    orderBy: [{ position: "asc" }, { createdAt: "asc" }],
  });
  return rows.map(toTask);
}

export async function getTaskForUser(
  id: string,
  userId: string
): Promise<Task | undefined> {
  await ensureSeeded();
  const t = await prisma.task.findFirst({ where: { id, userId } });
  return t ? toTask(t) : undefined;
}

export async function createTaskForUser(
  userId: string,
  input: {
    title: string;
    note: string;
    priority: Task["priority"];
    category: string;
    dueAt?: string | null;
    remindBefore?: RemindBefore;
  }
): Promise<Task> {
  await ensureSeeded();
  const agg = await prisma.task.aggregate({
    where: { userId },
    _max: { position: true },
  });
  const now = new Date().toISOString();
  const t = await prisma.task.create({
    data: {
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
      position: (agg._max.position ?? -1) + 1,
      createdAt: now,
      updatedAt: now,
    },
  });
  return toTask(t);
}

export async function updateTaskForUser(
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
): Promise<Task | undefined> {
  await ensureSeeded();
  const current = await prisma.task.findFirst({ where: { id, userId } });
  if (!current) return undefined;
  const data: Prisma.TaskUpdateInput = {};
  if (patch.title !== undefined) data.title = patch.title;
  if (patch.note !== undefined) data.note = patch.note;
  if (patch.priority !== undefined) data.priority = patch.priority;
  if (patch.category !== undefined)
    data.category = patch.category || "General";
  if (patch.status !== undefined) {
    // completedAt is server-side only: stamped on DONE, cleared on reopen.
    if (patch.status === "DONE" && current.status !== "DONE") {
      data.completedAt = new Date().toISOString();
    } else if (patch.status === "OPEN") {
      data.completedAt = null;
    }
    data.status = patch.status;
  }
  if (patch.dueAt !== undefined) data.dueAt = patch.dueAt;
  if (patch.remindBefore !== undefined) data.remindBefore = patch.remindBefore;
  if (patch.position !== undefined) data.position = patch.position;
  if (patch.incrementPomodoro) data.pomodoros = current.pomodoros + 1;
  data.updatedAt = new Date().toISOString();
  const t = await prisma.task.update({ where: { id }, data });
  return toTask(t);
}

/**
 * Persist a full manual ordering. Every id must belong to the user,
 * otherwise nothing is written (all-or-nothing).
 */
export async function reorderTasksForUser(
  userId: string,
  orderedIds: string[]
): Promise<boolean> {
  await ensureSeeded();
  const owned = new Set(
    (
      await prisma.task.findMany({
        where: { userId },
        select: { id: true },
      })
    ).map((t) => t.id)
  );
  if (!orderedIds.every((id) => owned.has(id))) return false;
  const now = new Date().toISOString();
  await prisma.$transaction(
    orderedIds.map((id, i) =>
      prisma.task.update({
        where: { id },
        data: { position: i, updatedAt: now },
      })
    )
  );
  return true;
}

export async function deleteTaskForUser(
  id: string,
  userId: string
): Promise<boolean> {
  await ensureSeeded();
  const result = await prisma.task.deleteMany({ where: { id, userId } });
  return result.count > 0;
}

export async function categoriesForUser(
  userId: string
): Promise<{ name: string; count: number }[]> {
  await ensureSeeded();
  const rows = await prisma.task.findMany({
    where: { userId },
    select: { category: true },
  });
  const map = new Map<string, number>();
  for (const r of rows) map.set(r.category, (map.get(r.category) ?? 0) + 1);
  return [...map.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => a.name.localeCompare(b.name));
}
