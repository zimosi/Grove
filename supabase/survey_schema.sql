-- ── Survey Responses ─────────────────────────────────────────────────────────
-- Stores lightweight feedback submitted after Order / Save Design actions.

create table if not exists survey_responses (
  id               uuid        primary key default gen_random_uuid(),
  created_at       timestamptz not null    default now(),

  -- Where & how the survey was triggered
  source_page      text        not null    default 'builder',
  trigger_action   text        not null    check (trigger_action in ('order_click', 'save_design')),

  -- Core survey fields
  satisfaction_rating int      not null    check (satisfaction_rating between 1 and 5),
  purchase_intent  text        not null    check (purchase_intent in ('yes', 'maybe', 'no')),
  feedback_text    text,
  email            text,

  -- Context snapshot (no 3D data — just summary)
  builder_snapshot jsonb,

  -- Identity (either/both may be null for guests)
  user_id          uuid        references auth.users(id) on delete set null,
  session_id       text,

  -- Optional link to a saved terrarium design
  design_id        uuid
);

-- Fast queries for the dashboard
create index if not exists survey_responses_created_at_idx
  on survey_responses (created_at desc);

create index if not exists survey_responses_session_id_idx
  on survey_responses (session_id);

-- ── Row-Level Security ────────────────────────────────────────────────────────
alter table survey_responses enable row level security;

-- Anyone (including unauthenticated visitors) can submit
create policy "Anyone can insert survey response"
  on survey_responses for insert
  with check (true);

-- Anyone can read responses (MVP — tighten to authenticated users later)
create policy "Anyone can read survey responses"
  on survey_responses for select
  using (true);
