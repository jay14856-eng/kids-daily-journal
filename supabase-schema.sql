-- Kids Journal Entries Table
-- Stores journal entries synced across devices using a sync_key
create table if not exists public.kids_journal_entries (
  sync_key text primary key,
  entries jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Enable RLS
alter table public.kids_journal_entries enable row level security;

-- RLS Policy: Anyone can read data for any sync_key
-- This allows devices to join and sync entries
create policy "Anyone can read kids journal entries with sync key"
  on public.kids_journal_entries for select
  using (true);

-- RLS Policy: Allow upsert with sync_key (no authentication needed, device-based only)
-- This allows offline-first sync without requiring sign-in
create policy "Anyone can insert or update kids journal entries"
  on public.kids_journal_entries for insert
  with check (true);

create policy "Anyone can update kids journal entries"
  on public.kids_journal_entries for update
  using (true)
  with check (true);

-- Index for faster queries
create index if not exists idx_kids_journal_sync_key 
  on public.kids_journal_entries(sync_key);

-- Timestamp trigger to auto-update updated_at
create or replace function update_kids_journal_timestamp()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger update_kids_journal_entries_timestamp
  before update on public.kids_journal_entries
  for each row
  execute function update_kids_journal_timestamp();
