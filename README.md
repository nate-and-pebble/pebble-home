# AI HQ — Pebble Home 🪨

Mission control for Pebble (AI assistant) and Nate. A shared dashboard for brain dumps, task tracking, and activity monitoring.

**Live at:** [aihq.itsmenate.com](https://aihq.itsmenate.com)

## Stack

- **Next.js 16** (App Router)
- **Tailwind CSS v4**
- **Supabase** (database + RLS)
- **Vercel** (hosting)

## Getting Started

1. Install dependencies:

```bash
pnpm install
```

2. Create `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
PEBBLE_API_KEY=optional-api-key-for-cli
```

3. Run Supabase migrations:

```bash
# Run all migration files against your Supabase database (via dashboard SQL editor)
supabase/migrations/001_create_brain_dumps.sql
supabase/migrations/002_add_tasks_and_metadata.sql
supabase/migrations/003_add_bulletins.sql
supabase/migrations/004_add_agent_coordination.sql
```

4. Start the dev server:

```bash
pnpm dev
```

## API Endpoints

All endpoints accept an optional `X-API-Key` header (required when `PEBBLE_API_KEY` is set).

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/brain-dumps` | Create brain dump `{ content }` |
| `GET` | `/api/brain-dumps` | List brain dumps `?page=&limit=&status=` |
| `PATCH` | `/api/brain-dumps/:id` | Update brain dump `{ status, metadata }` |
| `POST` | `/api/tasks` | Create task `{ title, description?, priority? }` |
| `GET` | `/api/tasks` | List tasks `?page=&limit=&status=&priority=` |
| `PATCH` | `/api/tasks/:id` | Update task `{ title?, status?, priority? }` |
| `POST` | `/api/bulletins` | Create bulletin `{ title, content? }` |
| `GET` | `/api/bulletins` | List bulletins `?page=&limit=&status=` |
| `PATCH` | `/api/bulletins/:id` | Update bulletin `{ title?, content?, status? }` |
| `GET` | `/api/activity` | Combined feed `?limit=` |
| `GET` | `/api/status` | Health + stats (counts, uptime) |

## CLI Tool

The CLI lives at `tools/pebble.js`. No extra dependencies needed (uses Node.js built-in `fetch`).

### Setup

Create `~/.pebble.json`:

```json
{
  "apiUrl": "http://localhost:3000",
  "apiKey": "your-api-key"
}
```

### Usage

```bash
# Brain dumps
./tools/pebble.js brain list
./tools/pebble.js brain add "Remember to refactor auth flow"
./tools/pebble.js brain status <id> processed

# Tasks
./tools/pebble.js tasks
./tools/pebble.js tasks --status todo --priority high
./tools/pebble.js task add "Deploy v2" --priority high
./tools/pebble.js task update <id> --status in_progress
./tools/pebble.js task done <id>

# Bulletins
./tools/pebble.js bulletins
./tools/pebble.js bulletins --status new
./tools/pebble.js bulletin add "Built the auth flow" --content "Details here"
./tools/pebble.js bulletin read <id>

# Status
./tools/pebble.js status
```

## Agent Coordination Protocol

AI HQ includes a coordination layer that lets multiple agents and heartbeat-driven runs work together without conflicts.

### How It Works

1. **Runs** — each agent session registers a "run" with a time-limited lease (default 10 min). The run tracks who's active and auto-expires if the agent dies.

2. **Task claims** — agents claim tasks with optimistic locking. A claim is a lease: if it expires, the task becomes available for another agent. Two agents can't claim the same task (409 conflict).

3. **Journal (run_log)** — structured log entries that persist across runs. Every agent logs what it did, decided, or handed off. The next heartbeat reads the journal to pick up context without relying on local memory files.

### Lifecycle

```
Start run → Check context → Claim task → Log progress → Release task → Complete run
    ↓              ↓              ↓              ↓              ↓              ↓
  pebble        pebble        pebble        pebble        pebble        pebble
  run start     context       claim         log           release       run complete
```

### Failure Modes

- **Agent crash**: lease expires → next heartbeat auto-releases claims
- **Concurrent claim**: second agent gets 409 → picks different task
- **Slow work**: extend lease via `pebble run heartbeat <run-id>`
- **Forgotten cleanup**: stale runs expire on next `pebble run start`

### Agent Coordination API

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/agent/runs` | Start a run `{ agent_id, lease_duration_minutes? }` |
| `GET` | `/api/agent/runs` | List runs `?agent_id=&status=&limit=` |
| `GET` | `/api/agent/runs/:id` | Get run with its log |
| `PATCH` | `/api/agent/runs/:id` | Update run `{ status?, summary?, heartbeat? }` |
| `POST` | `/api/agent/runs/:id/log` | Add journal entry `{ entry_type, content }` |
| `GET` | `/api/agent/runs/:id/log` | Get log entries for a run |
| `GET` | `/api/agent/journal` | Recent journal across all runs |
| `GET` | `/api/agent/context` | Full coordination context |
| `POST` | `/api/tasks/:id/claim` | Claim task `{ run_id, agent_id }` |
| `DELETE` | `/api/tasks/:id/claim` | Release claim `{ reason?, run_id? }` |

### Agent Coordination CLI

```bash
# Start a run (auto-cleans expired runs)
pebble run start openclaw

# See what's going on
pebble context

# Claim a task
pebble claim <task-id> --run <run-id> --agent openclaw

# Log progress
pebble log <run-id> "Deployed new feature" --type action

# Release a task
pebble release <task-id> --run <run-id> --reason completed

# Complete the run
pebble run complete <run-id> --summary "Processed brain dumps, deployed feature"

# Read the journal
pebble journal
```

## Project Structure

```
src/
  app/
    api/
      brain-dumps/       # Brain dump CRUD endpoints
      tasks/             # Task CRUD endpoints (+ claim/release)
      bulletins/         # Bulletin CRUD endpoints
      agent/             # Agent coordination endpoints
        runs/            # Run lifecycle (start, heartbeat, complete)
        journal/         # Cross-run journal entries
        context/         # Full coordination context
      activity/          # Combined activity feed
      status/            # Health/stats endpoint
    layout.tsx           # Root layout (dark theme, fonts)
    page.tsx             # Main dashboard
    globals.css          # Global styles + Tailwind
  components/
    dashboard.tsx        # Main dashboard shell (client)
    brain-dump.tsx       # Brain dump form
    bulletins.tsx        # Bulletin list with expand/read
    activity-feed.tsx    # Live activity feed
    task-queue.tsx       # Task list with status badges + claim info
    agent-runs.tsx       # Agent run list with expandable logs
    stats-cards.tsx      # Stats overview cards
    status-indicator.tsx # Online status indicator
  lib/
    supabase.ts          # Supabase client
    api-auth.ts          # API key auth middleware
supabase/
  migrations/            # SQL migrations (001-004)
tools/
  pebble.js              # CLI tool (+ agent coordination commands)
```

## Database Schema

### brain_dumps
| Column | Type | Default |
|--------|------|---------|
| id | uuid | gen_random_uuid() |
| content | text | required |
| status | text | 'new' |
| created_at | timestamptz | now() |
| metadata | jsonb | {} |

### tasks
| Column | Type | Default |
|--------|------|---------|
| id | uuid | gen_random_uuid() |
| title | text | required |
| description | text | null |
| status | text | 'todo' |
| priority | text | 'medium' |
| created_at | timestamptz | now() |
| completed_at | timestamptz | null |
| metadata | jsonb | {} |

### bulletins
| Column | Type | Default |
|--------|------|---------|
| id | uuid | gen_random_uuid() |
| title | text | required |
| content | text | null |
| status | text | 'new' |
| created_at | timestamptz | now() |
| read_at | timestamptz | null |
| metadata | jsonb | {} |

### agent_runs
| Column | Type | Default |
|--------|------|---------|
| id | uuid | gen_random_uuid() |
| agent_id | text | required |
| status | text | 'running' |
| started_at | timestamptz | now() |
| heartbeat_at | timestamptz | now() |
| completed_at | timestamptz | null |
| lease_expires_at | timestamptz | required |
| summary | text | null |
| metadata | jsonb | {} |

### run_log
| Column | Type | Default |
|--------|------|---------|
| id | uuid | gen_random_uuid() |
| run_id | uuid | FK → agent_runs |
| agent_id | text | required |
| entry_type | text | 'action' |
| content | text | required |
| related_task_id | uuid | FK → tasks (nullable) |
| metadata | jsonb | {} |
| created_at | timestamptz | now() |

### tasks (added columns)
| Column | Type | Default |
|--------|------|---------|
| assigned_agent | text | null |
| claim_run_id | uuid | FK → agent_runs (nullable) |
| claim_expires_at | timestamptz | null |
