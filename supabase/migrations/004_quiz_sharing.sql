-- ============================================================================
-- 004_quiz_sharing.sql
--
-- Tables for sharing quizzes with classmates and tracking authenticated
-- Google leaderboard scores.
-- ============================================================================

-- =========================
-- 1. shared_quizzes
-- =========================
create table if not exists shared_quizzes (
  id           uuid        primary key default gen_random_uuid(),
  share_code   varchar(8)  unique not null,
  title        text        not null,
  questions    jsonb       not null,
  created_by   uuid        references auth.users(id) on delete cascade,
  creator_name text,
  created_at   timestamptz default now()
);

-- =========================
-- 2. quiz_scores (Leaderboard)
-- =========================
create table if not exists quiz_scores (
  id                uuid        primary key default gen_random_uuid(),
  share_code        varchar(8)  not null references shared_quizzes(share_code) on delete cascade,
  user_id           uuid        not null references auth.users(id) on delete cascade,
  user_name         text        not null,
  user_avatar       text,
  score             int         not null,
  total             int         not null,
  time_used_seconds int         default 0,
  percentage        float       generated always as (
                                  round((score::numeric / nullif(total, 0) * 100)::numeric, 1)
                                ) stored,
  completed_at      timestamptz default now(),
  constraint uq_quiz_user unique(share_code, user_id)
);

-- =========================
-- 3. Indexes
-- =========================
create index if not exists idx_shared_quizzes_code on shared_quizzes(share_code);
create index if not exists idx_quiz_scores_leaderboard on quiz_scores(share_code, percentage desc, time_used_seconds asc);

-- =========================
-- 4. Row-Level Security
-- =========================
alter table shared_quizzes enable row level security;
alter table quiz_scores enable row level security;

-- Quizzes can be viewed by anyone with the share code
create policy "Anyone can read shared_quizzes"
  on shared_quizzes for select
  using (true);

-- Authenticated users can publish quizzes
create policy "Authenticated users can create shared_quizzes"
  on shared_quizzes for insert
  with check (auth.role() = 'authenticated');

-- Anyone can view the leaderboard
create policy "Anyone can read quiz_scores"
  on quiz_scores for select
  using (true);

-- Authenticated users can submit or update their score
create policy "Authenticated users can insert quiz_scores"
  on quiz_scores for insert
  with check (auth.uid() = user_id);

create policy "Authenticated users can update their own score"
  on quiz_scores for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
