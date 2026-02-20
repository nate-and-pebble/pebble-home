-- Create bulletins table
create table if not exists bulletins (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  content text,
  status text default 'new' not null,
  created_at timestamptz default now() not null,
  read_at timestamptz,
  metadata jsonb default '{}'::jsonb
);

-- Enable row-level security
alter table bulletins enable row level security;

-- Allow anonymous full access (personal dashboard)
create policy "Allow anonymous inserts" on bulletins
  for insert with check (true);

create policy "Allow anonymous reads" on bulletins
  for select using (true);

create policy "Allow anonymous updates" on bulletins
  for update using (true) with check (true);

create policy "Allow anonymous deletes" on bulletins
  for delete using (true);
