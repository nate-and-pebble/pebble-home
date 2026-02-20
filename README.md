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
# Run both migration files against your Supabase database
supabase/migrations/001_create_brain_dumps.sql
supabase/migrations/002_add_tasks_and_metadata.sql
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

## Project Structure

```
src/
  app/
    api/
      brain-dumps/       # Brain dump CRUD endpoints
      tasks/             # Task CRUD endpoints
      bulletins/         # Bulletin CRUD endpoints
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
    task-queue.tsx       # Task list with status badges
    stats-cards.tsx      # Stats overview cards
    status-indicator.tsx # Online status indicator
  lib/
    supabase.ts          # Supabase client
    api-auth.ts          # API key auth middleware
supabase/
  migrations/            # SQL migrations
tools/
  pebble.js              # CLI tool
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
