-- Add metadata column to brain_dumps
alter table brain_dumps add column if not exists metadata jsonb default '{}'::jsonb;

-- Allow anonymous updates on brain_dumps (for status changes)
create policy "Allow anonymous updates" on brain_dumps
  for update using (true) with check (true);

-- Create tasks table
create table if not exists tasks (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  description text,
  status text default 'todo' not null,
  priority text default 'medium' not null,
  created_at timestamptz default now() not null,
  completed_at timestamptz,
  metadata jsonb default '{}'::jsonb
);

-- Enable row-level security
alter table tasks enable row level security;

-- Allow anonymous full access (personal dashboard)
create policy "Allow anonymous inserts" on tasks
  for insert with check (true);

create policy "Allow anonymous reads" on tasks
  for select using (true);

create policy "Allow anonymous updates" on tasks
  for update using (true) with check (true);

create policy "Allow anonymous deletes" on tasks
  for delete using (true);
