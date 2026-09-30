# README_BEFORE_CODING — Taskady handoff context

> Read this file FIRST before touching code, then read `AGENTS.md` for
> operating rules. Paste this file into another model / platform to continue
> work with zero ramp-up.

## 1. What Taskady is

Mobile-first productivity web app. Tasks with notes, 3 priorities,
3 categories, live search/filter, drag-and-drop, Pomodoro timer,
due-dates + in-app reminders, GitHub-style heatmap, confetti celebrations.
Username + password auth, per-user data isolation, demo account `demo/demo1234`.

- Repo: `https://github.com/fabeklou/taskady` (branch `main`)
- Production: `https://taskady.vercel.app`
- Last healthy commit at time of writing: `c1cd2d6` (README live URL)

## 2. Stack (pinned, do not upgrade casually)

- Next.js `16.3.6` App Router + TypeScript + React 19
- Tailwind CSS v4 + SupaDupa theme in `app/globals.css`
- Auth: `bcryptjs` (cost 10) + `jose` JWT HS256 in httpOnly cookie `taskady_session`, 7-day expiry
- Validation: `zod` in `lib/validations.ts` (endpoint contract)
- Persistence: dual backend behind `lib/store.ts`
  - `DATABASE_URL` set → Prisma `6.19.3` + Neon Postgres (production)
  - unset → file-db (local dev + tests, zero setup)
- Timer/font/misc: `@dnd-kit/*` (drag-drop, swap semantics),
  `canvas-confetti`, `@vercel/analytics`, `@vercel/speed-insights`
- Tests: `vitest` (unit/contract), `playwright` (e2e, Chromium headless)
- Build/dev use `--webpack`: `next dev --webpack`, `next build --webpack`
  (Turbopack binding broken on original dev machine — keep flags)

## 3. Layout

```
app/                  routes only (page, login, signup, dashboard, api/*, not-found)
components/           presentational, "use client" only for interactivity
lib/                  pure logic + backends:
  auth.ts             hash, sign/verify session, cookie headers
  validations.ts      zod schemas (endpoint contract)
  filter.ts           single source of truth for task filtering
  pomodoro.ts         25:00 / 05:00 defaults
  store.ts            lazy backend selector, async wrappers only
  store-file.ts       file-db backend (.data/db.json local, /tmp/taskady-db.json on Vercel)
  store-prisma.ts     Prisma backend (Neon), inert unless DATABASE_URL set
  types.ts            Task, Priority, TaskStatus, RemindBefore
  reminders.ts/sound.ts/stats.ts  banners, Web Audio sounds, heatmap helpers
prisma/               schema.prisma + migrations/0001_init (User, Task tables)
scripts/prebuild.mjs  runs `prisma migrate deploy` only when DATABASE_URL set
                      (prefers DIRECT_URL for migrations)
tests/                store, validations, filter, pomodoro, reminders, stats + e2e/
public/fonts/         self-hosted Bricolage Grotesque variable woff2
middleware.ts         protects /dashboard* (redirect) and /api/tasks* + /api/categories (401 JSON)
```

## 4. Data model

`Task`: id, userId, title, note, priority (`LOW|MEDIUM|HIGH`),
category (`General|Personal|Professional`, legacy normalized to `General`),
status (`OPEN|DONE`), pomodoros, completedAt (server-stamped on DONE, cleared on reopen),
dueAt (ISO|null), remindBefore (`NONE|DAY|3H|1H`), position (manual order),
createdAt, updatedAt.

`User`: id, username (unique, case-insensitive lookup), passwordHash, createdAt.
Demo user id = `sha256("taskady-demo-user:"+username)` so all serverless
instances agree. New users get `randomUUID()` — only safe because production
now shares one Postgres.

## 5. API contracts (do not change status codes)

- `POST /api/auth/signup|login` → 201/200, 400 validation, 409 duplicate username
- `GET /api/auth/me` → 200/401, `DELETE` = logout (clear cookie)
- `GET /api/tasks?q&category&priority&status` → 401 unauthenticated
- `POST /api/tasks` → 201, 400 validation
- `PATCH /api/tasks/[id]` (partial + `incrementPomodoro`) → 400/401/404-scoped-to-user
- `DELETE /api/tasks/[id]` → 404 if not owned
- `POST /api/tasks/reorder {orderedIds}` → full order, all ids must belong to user or 404, all-or-nothing
- `GET /api/categories` → `{name,count}[]` derived from user's tasks
- Every store query scopes by `userId`. Never leak `passwordHash` or other users' rows.

## 6. Design / UX laws

- Tokens: `--color-forest: #163300`, `--color-lime: #D3F773`, font Bricolage Grotesque (self-hosted via `next/font/local`). No new brand colors/fonts.
- Priorities: LOW lime `#D3F773`, MEDIUM amber `#FFB020`, HIGH red `#FF5A5A`.
- Mobile-first 360px, tap targets ≥44px, sticky bottom "+ New task" CTA.
- Timer never auto-completes a task. Confetti + modal on focus-end AND on manual DONE.
- Timer engine derives from wall-clock `endsAt` + per-username localStorage (background-safe).
- Drag-drop swap semantics, persist full id order. `DeleteDialog`, never `window.confirm()`.
- Heatmap collapsed by default, SVG chevrons only (no text glyphs).

## 7. Env vars

```
JWT_SECRET            long random ≥32 bytes (required, prod + local)
DEMO_USERNAME=demo
DEMO_PASSWORD=demo1234
DATABASE_URL          Neon pooled connection (required in production, absent locally)
DIRECT_URL            Neon direct connection (migrations only)
TASKADY_DB_PATH       optional file-db override (tests use tmp file)
```

Local dev intentionally has NO `DATABASE_URL` (stays on file-db).
Never commit `.data/`, `.env*`, real user data.

## 8. Commands

```
npm install
npm run dev          # login as demo/demo1234, test at 360px width
npm run test:api     # vitest, must be green before claiming endpoint work done
npm run build        # prebuild (migrate if DB) + Next production build, must be green
npm run lint
npm run test:e2e     # Playwright vs live dev server
```

## 9. Current state / gotchas

- Production healthy on Neon. File-db fallback is dev/test only — ephemeral per
  Vercel instance, logins/tasks break across instances. Never rely on it in prod.
- `next/font/google` was removed after a flaky Vercel build fetch failure;
  font is self-hosted in `public/fonts/`. Do not reintroduce the Google fetch.
- `middleware.ts` name triggers a Next 16 deprecation warning (suggests `proxy`);
  rename is optional, current file works.
- Preview deployments (`*-git-main-*.vercel.app`) track `main` immediately;
  production (`taskady.vercel.app`) only advances on successful prod deploy /
  manual Promote to Production.
- Remote URL historically contained an embedded PAT — rotate if still present,
  use credential helper.
