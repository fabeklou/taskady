# AGENTS.md — Taskady Operating Rules

> Read this file before writing any code. It overrides default instincts.
> Think like a **senior software engineer + architect with 20+ years of experience**:
> boring, minimal, tested, secure, and shippable on Vercel Free.

## 1. Prime Directive

- **Write code only if needed.** Prefer deleting code over adding it. No speculative
  features, no "nice-to-have" abstractions, no new dependencies without justification.
- **Mobile-first, always.** Every UI change must look right at 360px wide first,
  then scale up. Tap targets ≥ 44px. Sticky bottom CTA for primary actions.
- **Design system is law.** SupaDupa tokens live in `app/globals.css`:
  `--color-forest: #163300`, `--color-lime: #D3F773`, font `Bricolage Grotesque`.
  Never invent new brand colors or fonts. Priority colors are fixed:
  LOW = lime `#D3F773`, MEDIUM = amber `#FFB020`, HIGH = red `#FF5A5A`.

## 2. Architecture (do not reinvent)

```
app/            → routes only (landing, login, signup, dashboard, api/*)
components/     → presentational, client-only where needed ("use client")
lib/            → pure logic: auth.ts, store.ts, validations.ts, filter.ts, pomodoro.ts
tests/          → vitest contract tests for the above
```

- `lib/filter.ts` is the **single source of truth** for task filtering. The API
  (`GET /api/tasks`) and the dashboard client MUST both use `filterTasks()`.
- `lib/store.ts` is the only module that touches persistence. It selects the
  backend once at startup: Prisma/Neon Postgres when `DATABASE_URL` is set
  (production), otherwise the file-db (`lib/store-file.ts` / `lib/store-prisma.ts`
  expose identical async APIs). Every task query
  MUST scope by `userId`. Never return another user's rows. Never leak `passwordHash`.
- `lib/validations.ts` (zod) is the **endpoint contract**. Routes validate with it
  before touching the store. Tests validate the schemas.

## 3. Mandatory Workflow (no exceptions)

1. **Understand first:** read the route/component/lib files you will touch. Do not guess APIs.
2. **Smallest diff:** change as few files as possible. Prefer editing over creating.
3. **Test before validation:**
   - `npm run test:api` (vitest: validations, filter, pomodoro, per-user store isolation)
     MUST pass before claiming any endpoint work is done.
   - New endpoint logic? Add/extend a test in `tests/` FIRST or alongside — especially
     for `/api/tasks*` and `/api/auth/*` contracts (status codes: 400 validation,
     401 unauthenticated, 404 not-found-scoped-to-user, 409 duplicate username).
   - Then run `npm run build` (Next.js typecheck + production build) and fix errors.
4. **Verify manually:** `npm run dev` → login as `demo/demo1234` → exercise the changed
   flow on a narrow viewport. Pomodoro: timer must NEVER auto-complete a task.
5. **Report:** state files changed, tests run (with counts), and any load-bearing
   trade-off (e.g. file-db ephemerality on Vercel — see §6).

## 4. API Conventions

- Auth: JWT (`jose`, HS256) in httpOnly cookie `taskady_session`, 7-day expiry.
  `middleware.ts` protects `/dashboard*` (redirect) and `/api/tasks*` + `/api/categories` (401 JSON).
- Always: `const userId = await getSessionUserId(); if (!userId) → 401`.
- Tasks: `GET /api/tasks?q&category&priority&status`, `POST /api/tasks` (201),
  `PATCH /api/tasks/[id]` (partial + `incrementPomodoro`), `DELETE /api/tasks/[id]`,
  `POST /api/tasks/reorder` (`{orderedIds}` — all ids must belong to the user).
  Task fields: title, note, priority, category, status, pomodoros, `dueAt` (ISO|null),
  `remindBefore` (NONE|DAY|3H|1H), `position` (manual drag order).
- Categories are derived from the user's tasks (`GET /api/categories` → `{name,count}`).
- Passwords: `bcryptjs` hash (cost 10). Compare with constant-time `compare`.
  Default demo account is seeded in `lib/store.ts` from `DEMO_USERNAME/DEMO_PASSWORD`.

## 5. UI Conventions

- Pages are server components by default; add `"use client"` only for interactivity
  (dashboard, forms, timer, confetti).
- Celebration UX: `canvas-confetti` + modal on (a) focus timer reaching 0 and
  (b) task toggled to DONE. Manual completion only — no exceptions.
- Categories: `<datalist>` + suggestion chips; search box filters title/note/category
  live via `useMemo`. Category pills show counts and respect the category search field.
- Pomodoro defaults: 25:00 focus / 05:00 break (`lib/pomodoro.ts`). Keep them.
- Pomodoro engine (`components/usePomodoro.ts`) derives time from a wall-clock
  `endsAt` timestamp + localStorage, so it runs in the background (sheet closed,
  scrolling, reloads). Phase-end sounds use Web Audio (`lib/sound.ts`) — no asset
  files. Reminders are in-app banners (`lib/reminders.ts` pure helpers) — no
  service worker, no push.
- Drag-and-drop uses `@dnd-kit/*` (the one justified extra dependency: touch +
  mouse sorting). Drop semantics are SWAP (exchange the two tasks' places).
  Persist via `POST /api/tasks/reorder` with the FULL id order.
- Categories are strictly `General | Personal | Professional` (zod enum in
  `lib/validations.ts`); `normalizeTask` in the store maps legacy values to
  `General` so old data keeps working.
- Destructive actions use the custom `DeleteDialog` — never `window.confirm()`.
- Productivity heatmap (`lib/stats.ts` pure + `components/Heatmap.tsx`) is derived
  client-side from `completedAt` (stamped server-side in `store.ts` on DONE,
  cleared on reopen). No extra endpoint.
- Browser proof: `npm run test:e2e` (Playwright, Chromium headless shell) clicks
  the real UI against the live dev server — timer pause/minimize, heatmap
  lighting up. Add e2e coverage when touching those flows.
- Touch proof: `tests/e2e/mobile.spec.ts` runs at 390px with touch taps
  (pause/minimize/focus-session, dimmer opacity, cross-account timer isolation).

## 6. Deployment & Data (Vercel Free)

- Zero-config deploy: `vercel` with `JWT_SECRET`, `DEMO_USERNAME`, `DEMO_PASSWORD`,
  `DATABASE_URL` (Neon pooled) and `DIRECT_URL` (Neon direct, for migrations) set.
  Schema lives in `prisma/`; `scripts/prebuild.mjs` runs `migrate deploy` during
  the Vercel build only. Without `DATABASE_URL` the app falls back to the file-db:
  local `.data/db.json`, on Vercel `/tmp/taskady-db.json` — ephemeral per instance,
  so sessions and tasks break across instances (dev/test only, never production).
- Never commit `.data/`, `.env*`, or real user data. `.env.example` documents all vars.

## 7. Forbidden

- No new auth providers, no OAuth, no email flows, no paid services.
- No `any` without justification, no `console.log` in routes, no TODOs left behind.
- No CSS frameworks beyond Tailwind v4 + the SupaDupa theme. No emojis in code comments.
- Never auto-mark tasks DONE from the timer. Never expose password hashes or other users' tasks.

## 8. Definition of Done

- [ ] `npm run test:api` green
- [ ] `npm run build` green
- [ ] Manual mobile-viewport check of the touched flow (auth → tasks → filter → pomodoro → confetti)
- [ ] README updated if behavior/env changed

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
