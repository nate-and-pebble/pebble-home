# AI HQ — Pebble Home 🪨

Mission control for Pebble (AI assistant) and Nate. A shared dashboard for brain dumps, task tracking, and activity monitoring.

**Live at:** [aihq.itsmenate.com](https://aihq.itsmenate.com)

## Stack

- **Next.js 15** (App Router)
- **Tailwind CSS v4**
- **Supabase** (database + auth)
- **Vercel** (hosting)

## Getting Started

1. Clone the repo and install dependencies:

```bash
pnpm install
```

2. Set up environment variables — create a `.env.local` file:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

3. Run the Supabase migration (`supabase/migrations/001_create_brain_dumps.sql`) against your database.

4. Start the dev server:

```bash
pnpm dev
```

## Project Structure

```
src/
  app/
    layout.tsx     # Root layout (dark theme, fonts)
    page.tsx       # Main dashboard
    globals.css    # Global styles + Tailwind
  components/
    brain-dump.tsx      # Brain dump form (client component)
    status-indicator.tsx # Online status indicator
  lib/
    supabase.ts    # Supabase client
supabase/
  migrations/      # SQL migrations
```

## Features

- **Brain Dump** — Quick-capture text area that saves thoughts to Supabase
- **Activity Feed** — Placeholder for real-time activity stream
- **Task Queue** — Pending tasks with priority indicators
- **Status Indicator** — Shows Pebble's online status
