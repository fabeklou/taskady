# PLAN.md — Taskady build + fix history (from chat)

Source: the full working session up to `c1cd2d6` (2026-09-30).
Each entry: problem → decision → commit/result.

## Phase 0 — Initial build (commit `10c11f9`)

- Goal: mobile-first productivity MVP on Vercel Free.
- Built: landing, login/signup, dashboard, task/category/auth APIs,
  middleware, Pomodoro + dock + dimmer + reminders + heatmap,
  delete dialog, drag-and-drop (swap), celebration modal.
- Stack choices: Next 16 App Router, Tailwind v4, file-db
  (`.data/db.json` local, `/tmp/taskady-db.json` on Vercel),
  custom bcrypt+jose cookie auth, `next/font/google` Bricolage,
  Vercel Analytics + Speed Insights.
- Fix during setup: Turbopack binding broken → `--webpack` flags on
  dev/build; `@types/node` ^20 → ^22 for vitest 5 peer range.

## Phase 1 — Polish bugfixes (pre-deploy)

- Cross-account timer leak → per-username localStorage keys + legacy cleanup.
- Dead dock buttons → `pointer-events-auto` fix.
- Dimmer opacity verified via screenshot; heatmap made collapsible then
  default-collapsed with SVG chevrons; timer minimize → SVG chevron.
- Branded `app/not-found.tsx` (`67bf125`).
- Verification at the time: lint clean, 37/37 vitest, 4/4 Playwright, build green.

## Phase 2 — Deploy (`0c9242b`, `04eddb0`)

- Pushed to `github.com/fabeklou/taskady` (`main`), Vercel auto-deploy,
  live at `https://taskady-ten.vercel.app`.
- Added Analytics + Speed Insights; fixed build peer dep.

## Phase 3 — "Blank dashboard" investigation

- Reports: `/dashborad` (mistype → correct branded 404, no repo match),
  `/login`→`/dashboard` bounce (intentional for logged-in sessions),
  empty dashboard with `{"tasks":[]}`.
- Root cause: file-db per Vercel instance + random demo UUID per instance →
  `/dashboard ↔ /login` loop across instances.
- Fix `3786e30`: deterministic demo id `sha256("taskady-demo-user:"+username)`
  so sessions validate on every instance. Task rows still per-instance
  (accepted trade-off at the time).

## Phase 4 — "Tasks disappear on logout/login, new accounts broken"

- Same file-db root cause, now affecting ALL users: new accounts get
  `randomUUID()` ids, so a signup on instance A is unknown on instance B;
  re-login can land on an instance with an empty `/tmp` copy.
- Decision (per AGENTS.md §6 prescription): migrate production to shared
  Neon Postgres via Prisma, keep file-db as local/test fallback.

## Phase 5 — Neon + Prisma migration (commit `02a27ad`)

- Added `prisma@6` + `@prisma/client@6`, `prisma/schema.prisma`
  (User/Task, ISO-string dates mirroring file-db), `0001_init` migration.
- Split `lib/store.ts` → `store-file.ts` + `store-prisma.ts` + lazy
  `store.ts` selector (dynamic import; static Prisma import broke Next dev
  bundling with `vendor-chunks/bcryptjs.js` 500s).
- Store API became async (Prisma is network I/O) → routes + tests gained
  `await`s; HTTP contracts unchanged (400/401/404/409).
- `scripts/prebuild.mjs`: `migrate deploy` at Vercel build time only
  (prefers `DIRECT_URL`), no-op locally. `postinstall` runs `prisma generate`.
- Docs: `.env.example` (`DATABASE_URL` pooled, `DIRECT_URL` direct),
  README + AGENTS §6 updated.
- Local verification: tsc clean, lint clean, 37/37 unit, build green, 4/4 e2e.
  Prisma backend not yet runtime-proven (no DB from agent side).

## Phase 6 — Neon connection strings

- User pasted Neon agent-deploy steps (`neon deploy` etc.) — skipped as
  not applicable; migrations run in Vercel build.
- Guidance given: copy pooled string → `DATABASE_URL`, direct → `DIRECT_URL`
  from console.neon.tech Connection Details (or
  `neon connection-string [--pooled]`), set in Vercel env (Production +
  Preview), then Redeploy. Local `.env` stays DB-less on purpose.

## Phase 7 — Font build failure → self-host (commit `030ed43`)

- Build log: migration `0001_init` applied to Neon ✓, then
  `next/font/google` fetch failed (`Cannot read properties of null` in
  Google loader) — flaky build-infra network, same import passed before.
- Fix: downloaded official Bricolage variable woff2 (verified `wOF2`, 41KB)
  to `public/fonts/`, switched `app/layout.tsx` to `next/font/local`.
  Same face/weights, no build-time network. Lint + local build green.

## Phase 8 — Preview works, production doesn't

- `taskady-git-main-*.vercel.app` (latest `main`) worked;
  `taskady-ten.vercel.app` still broken — it served the older promoted
  deployment (the `02a27ad` prod build died on the font error).
- Fix (no code): Deployments → `030ed43` Ready → Promote to Production →
  hard refresh. Advisory: check Settings → Git production branch `main`.

## Phase 9 — Final URL (commit `c1cd2d6`)

- Production renamed to `https://taskady.vercel.app`.
- README Live Demo updated, committed, pushed (docs-only rebuild).

## Phase 10 — Handoff docs (current request)

- `README_BEFORE_CODING.md`: portable context for other models/platforms.
- `PLAN.md` (this file): session history.
- `AGENTS.md`: added mandatory read of `README_BEFORE_CODING.md`.

## Open / next

1. Real-user production test: signup new account → tasks → logout/login →
   persistence across instances (closes Phase 5 gap).
2. Optional: rename `middleware.ts` → `proxy.ts` (Next 16 convention).
3. Optional: rotate GitHub PAT out of remote URL; use credential helper.
4. Never: reintroduce `next/font/google` fetch, commit `.data`/`.env`,
   auto-complete tasks from timer, expose hashes or cross-user rows.
