-- Create goals table
create table if not exists goals (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  description text,
  status text default 'active' not null,
  priority text default 'medium' not null,
  tags text[] default '{}'::text[] not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  metadata jsonb default '{}'::jsonb not null
);

-- Enable row-level security
alter table goals enable row level security;

-- Allow anonymous full access (personal dashboard)
create policy "Allow anonymous inserts" on goals
  for insert with check (true);

create policy "Allow anonymous reads" on goals
  for select using (true);

create policy "Allow anonymous updates" on goals
  for update using (true) with check (true);

create policy "Allow anonymous deletes" on goals
  for delete using (true);
