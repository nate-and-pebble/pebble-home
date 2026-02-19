create table if not exists brain_dumps (
  id uuid default gen_random_uuid() primary key,
  content text not null,
  created_at timestamptz default now() not null,
  status text default 'new' not null
);

-- Enable row-level security
alter table brain_dumps enable row level security;

-- Allow anonymous inserts (for the dashboard)
create policy "Allow anonymous inserts" on brain_dumps
  for insert with check (true);

-- Allow anonymous reads
create policy "Allow anonymous reads" on brain_dumps
  for select using (true);
