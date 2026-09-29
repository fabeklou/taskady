import type * as FileBackend from "./store-file";
import type { RemindBefore, Task } from "./types";

/**
 * Persistence entry point — routes import ONLY from here.
 *
 * Backend is chosen lazily on first use: shared Postgres (Prisma) when
 * DATABASE_URL is set (Vercel production), otherwise the local file-db.
 * Both backends (`lib/store-file.ts` / `lib/store-prisma.ts`) expose
 * identical async signatures, so routes and tests never care which one is
 * active. Dynamic import keeps heavy deps (Prisma) out of the request
 * bundle until the backend is actually selected.
 */
type StoreApi = Pick<
  typeof FileBackend,
  | "findUserByUsername"
  | "findUserById"
  | "createUser"
  | "listTasksForUser"
  | "getTaskForUser"
  | "createTaskForUser"
  | "updateTaskForUser"
  | "reorderTasksForUser"
  | "deleteTaskForUser"
  | "categoriesForUser"
>;

let cached: Promise<StoreApi> | null = null;

function backend(): Promise<StoreApi> {
  if (!cached) {
    cached = process.env.DATABASE_URL
      ? import("./store-prisma")
      : import("./store-file");
  }
  return cached;
}

type UpdatePatch = Partial<
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
};

export async function findUserByUsername(
  username: string
): Promise<
  { id: string; username: string; passwordHash: string; createdAt: string } | undefined
> {
  return (await backend()).findUserByUsername(username);
}

export async function findUserById(
  id: string
): Promise<
  { id: string; username: string; passwordHash: string; createdAt: string } | undefined
> {
  return (await backend()).findUserById(id);
}

export async function createUser(
  username: string,
  passwordHash: string
): Promise<{
  id: string;
  username: string;
  passwordHash: string;
  createdAt: string;
}> {
  return (await backend()).createUser(username, passwordHash);
}

export async function listTasksForUser(userId: string): Promise<Task[]> {
  return (await backend()).listTasksForUser(userId);
}

export async function getTaskForUser(
  id: string,
  userId: string
): Promise<Task | undefined> {
  return (await backend()).getTaskForUser(id, userId);
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
  return (await backend()).createTaskForUser(userId, input);
}

export async function updateTaskForUser(
  id: string,
  userId: string,
  patch: UpdatePatch
): Promise<Task | undefined> {
  return (await backend()).updateTaskForUser(id, userId, patch);
}

export async function reorderTasksForUser(
  userId: string,
  orderedIds: string[]
): Promise<boolean> {
  return (await backend()).reorderTasksForUser(userId, orderedIds);
}

export async function deleteTaskForUser(
  id: string,
  userId: string
): Promise<boolean> {
  return (await backend()).deleteTaskForUser(id, userId);
}

export async function categoriesForUser(
  userId: string
): Promise<{ name: string; count: number }[]> {
  return (await backend()).categoriesForUser(userId);
}
