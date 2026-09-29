# Taskady 🍅 — Tasks that move you

> A mobile-first productivity app: track tasks with notes, priorities and categories,
> focus with a simple Pomodoro timer, and celebrate every win with confetti.

**Design:** same system as [supadupa.nl](https://www.supadupa.nl/) — `Bricolage Grotesque`
type, deep forest green `#163300`, lime `#D3F773`, huge bold headings, pill buttons.

## ✨ Features

- 📝 **Tasks** — title + optional note, 3 priority levels with default colors
  (🟢 Low / 🟡 Medium / 🔴 High), free-form categories
- 🔎 **Real-time find** — one search box (title + note + category) + category pills
  with counts and category text-filter + priority/status filters, all instant
- 🍅 **Pomodoro** — configurable focus / short / long break lengths, keeps running
  in the background (mini-player dock, survives reloads), one sound per phase end.
  Tasks are **only** marked done manually — never by the timer
- 🗑️ **Delete dialog** — custom confirm modal, no browser popups
- ↕️ **Drag & drop** — swap two tasks with the ⋮⋮ handle (mouse + touch), order persists
- 📅 **Due dates + reminders** — optional due date/time, reminder 1 day / 3h / 1h
  before via in-app banner, overdue + due-soon badges, created date on every task
- 🔥 **Productivity heatmap** — GitHub-style forest/lime grid of completions,
  streak counter, total + best day, tooltips per day, collapsible to save space
- ✨ **Motion + glass** — staggered list entrances, smooth presses, glassy sticky
  "+ New task" button that tasks slide under while scrolling
- 🎉 **Celebrations** — confetti + motivational alert after a focus session
  AND when a task is marked done
- 🔐 **Private by default** — username + password auth (JWT cookie);
  every query is scoped to the logged-in user
- 📱 **Mobile-first** — bottom-sheet forms, sticky "+ New task" CTA, 44px targets

## 🚀 Live Demo

> **Paste your Vercel link here:**
>
> 👉 `https://YOUR-APP-NAME.vercel.app`
>
> Test account (works locally and on the demo): **`demo` / `demo1234`**

## 🧑‍💻 Run locally (Windows PowerShell)

```powershell
npm install
Copy-Item .env.example .env.local
# edit .env.local -> set JWT_SECRET to a long random string
npm run dev
```

Open `http://localhost:3000` → Sign up, or log in with `demo / demo1234`.

## 🧪 Test (endpoints first, per AGENTS.md)

```powershell
npm run test:api   # vitest: validations, filter, pomodoro, per-user isolation
npm run build      # Next.js production build must pass
```

## ☁️ Deploy on Vercel (free)

1. Push this repo to GitHub.
2. On [vercel.com](https://vercel.com) → **Add New → Project** → import the repo.
3. Create a free Postgres at [neon.tech](https://neon.tech), then Environment Variables:
   - `JWT_SECRET` = long random string (required)
   - `DEMO_USERNAME` = `demo`
   - `DEMO_PASSWORD` = `demo1234`
   - `DATABASE_URL` = Neon **pooled** connection string (required in production)
   - `DIRECT_URL` = Neon **direct** connection string (used for migrations)
4. **Deploy.** Tables migrate automatically during the build. No other build config needed.
5. Copy the production URL into the **Live Demo** section above.

> Note: without `DATABASE_URL` the app falls back to a file-db (`.data/db.json`
> locally, `/tmp` on Vercel serverless). That fallback is per-instance and
> ephemeral, so logins and tasks break across instances — local dev and tests
> only, never production. See `AGENTS.md §6`.

## 🗂️ Project map

```
app/page.tsx                  landing (SupaDupa hero + demo hint)
app/login|signup/page.tsx     auth forms (mobile-first)
app/dashboard/                protected tasks UI (search, filters, pomodoro, confetti)
app/api/auth/*                signup, login, me, logout (JWT cookie)
app/api/tasks*                CRUD, per-user scoped, validated with zod
app/api/categories            derived {name,count} for filter pills
lib/                          auth, store, validations, filter, pomodoro
components/                   Header, TaskCard, TaskForm, PomodoroTimer, CelebrationModal
tests/                        endpoint-contract tests (run before validation)
AGENTS.md                     contributor/agent rules (senior-architect mode)
```

## 🔑 Default test account

| Username | Password   |
| -------- | ---------- |
| `demo`   | `demo1234` |

Seeded automatically on first run with 3 sample tasks (override via env).
