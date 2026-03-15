-- Grove Terrarium: database schema + RLS
-- Run this in your Supabase SQL editor

-- ── terrariums ────────────────────────────────────────────────────────────────
create table if not exists public.terrariums (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null default 'My Terrarium',
  state       jsonb not null,            -- serialised BuilderState
  preview_url text,                      -- optional screenshot URL (future)
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Keep updated_at current automatically
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists terrariums_updated_at on public.terrariums;
create trigger terrariums_updated_at
  before update on public.terrariums
  for each row execute function public.set_updated_at();

-- ── Row Level Security ────────────────────────────────────────────────────────
alter table public.terrariums enable row level security;

-- Users may only see their own designs
create policy "select own" on public.terrariums
  for select using (auth.uid() = user_id);

-- Users may only insert rows for themselves
create policy "insert own" on public.terrariums
  for insert with check (auth.uid() = user_id);

-- Users may only update their own rows
create policy "update own" on public.terrariums
  for update using (auth.uid() = user_id);

-- Users may only delete their own rows
create policy "delete own" on public.terrariums
  for delete using (auth.uid() = user_id);
