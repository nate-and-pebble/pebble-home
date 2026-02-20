# Goals Feature (AI HQ / pebble-home)

## Problem
When AI HQ has no tasks/brain dumps, Pebble has no deterministic “what next” and heartbeats devolve into low-value status checks.

## Objective
Add a first-class **Goals** system so:
- Nate can maintain high-level goals + priorities in a UI
- Pebble can query goals via API/CLI and pick a “next best action” when the inbox is empty

## Proposed Data Model
Table: `goals`
- `id uuid primary key default gen_random_uuid()`
- `title text not null`
- `description text`
- `status text not null default 'active'` (active|paused|done)
- `priority text not null default 'medium'` (urgent|high|medium|low)
- `tags text[] not null default '{}'`
- `metadata jsonb not null default '{}'::jsonb`
  - `next_action: string` (short imperative)
  - optional: `links: string[]`, `owner`, `cadence`, etc.
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

RLS: enabled. Anonymous CRUD policies (match `tasks` table approach).

## API
- `GET /api/goals?status=&page=&limit=` → `{ data, pagination }`
- `POST /api/goals` → create `{ title, description?, priority?, tags?, metadata? }`
- `PATCH /api/goals/:id` → update fields (status/priority/title/description/tags/metadata)

## UI
- Sidebar item: **Goals**
- `/goals` page:
  - list goals (active first, sort by priority then created_at)
  - create goal form (title + optional next_action)
  - quick actions: set status done/paused

## “Next Best Action” Panel
Visible on home/dashboard.
Logic:
- If `tasks(status in todo,in_progress)` count == 0 AND `brain-dumps(status=new)` count == 0:
  - fetch top `goals(status=active)` ordered by priority
  - display `title` + `metadata.next_action` (fallback to “Define next_action”)
  - include button to create a task from next_action (optional)

## CLI (tools/pebble.js)
- `pebble.js goals [--status active|paused|done]`
- `pebble.js goal add <title> --priority --description --tag ... --next-action "..."`
- `pebble.js goal update <id> --status --priority --title --description --next-action`
- `pebble.js goal done <id>`

## Test Steps
1. Run migration in Supabase.
2. `pebble.js goal add "Ship cc-usage-web" --priority high --next-action "Scaffold Next.js app"`
3. Visit `/goals` and confirm list + create works.
4. Ensure dashboard shows next best action when inbox empty.
