-- Agent coordination layer: runs, journal, task claims

-- Agent Runs: tracks each agent session/heartbeat
create table if not exists agent_runs (
  id uuid default gen_random_uuid() primary key,
  agent_id text not null,
  status text not null default 'running',
  started_at timestamptz default now() not null,
  heartbeat_at timestamptz default now() not null,
  completed_at timestamptz,
  lease_expires_at timestamptz not null,
  summary text,
  metadata jsonb default '{}'::jsonb
);

-- Run Log: structured journal entries per run
create table if not exists run_log (
  id uuid default gen_random_uuid() primary key,
  run_id uuid not null references agent_runs(id) on delete cascade,
  agent_id text not null,
  entry_type text not null default 'action',
  content text not null,
  related_task_id uuid references tasks(id) on delete set null,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now() not null
);

-- Add claim columns to tasks
alter table tasks add column if not exists assigned_agent text;
alter table tasks add column if not exists claim_run_id uuid references agent_runs(id) on delete set null;
alter table tasks add column if not exists claim_expires_at timestamptz;

-- Indexes
create index if not exists idx_agent_runs_agent on agent_runs(agent_id);
create index if not exists idx_agent_runs_status on agent_runs(status);
create index if not exists idx_agent_runs_started on agent_runs(started_at desc);
create index if not exists idx_run_log_run on run_log(run_id);
create index if not exists idx_run_log_created on run_log(created_at desc);
create index if not exists idx_tasks_assigned on tasks(assigned_agent);
create index if not exists idx_tasks_claim_expires on tasks(claim_expires_at);

-- RLS for agent_runs
alter table agent_runs enable row level security;
create policy "Allow anonymous inserts" on agent_runs for insert with check (true);
create policy "Allow anonymous reads" on agent_runs for select using (true);
create policy "Allow anonymous updates" on agent_runs for update using (true) with check (true);

-- RLS for run_log
alter table run_log enable row level security;
create policy "Allow anonymous inserts" on run_log for insert with check (true);
create policy "Allow anonymous reads" on run_log for select using (true);
