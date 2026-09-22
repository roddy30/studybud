-- ============================================================================
-- 001_initial_schema.sql
-- 
-- Creates the core tables for StudyBud:
--   - sets: study sets identified by join codes
--   - sources: uploaded materials (PDF, text, YouTube)
--   - flashcards: AI-generated flashcards linked to sets and chunks
--   - chat_messages: RAG chat history per session
--
-- RLS is enabled on all tables with permissive policies for v1 (no auth).
-- ============================================================================

-- =========================
-- 1. sets
-- =========================
create table sets (
  id                uuid        primary key default gen_random_uuid(),
  title             text        not null,
  description       text,
  join_code         varchar(8)  unique not null,
  creator_pin_hash  text        not null,
  join_code_expires_at timestamptz default (now() + interval '30 days'),
  daily_token_budget   int      default 100000,
  tokens_used_today    int      default 0,
  tokens_reset_at      timestamptz default now(),
  created_at        timestamptz default now()
);

-- =========================
-- 2. sources
-- =========================
create table sources (
  id                uuid   primary key default gen_random_uuid(),
  set_id            uuid   not null references sets(id) on delete cascade,
  type              text   not null check (type in ('pdf', 'text', 'youtube')),
  title             text   not null,
  raw_text          text,
  original_url      text,
  storage_path      text,
  processing_status text   not null default 'pending'
                           check (processing_status in (
                             'pending', 'extracting', 'chunking',
                             'embedding', 'generating', 'done', 'error'
                           )),
  error_message     text,
  created_at        timestamptz default now()
);

-- =========================
-- 3. flashcards
-- =========================
-- NOTE: source_chunk_id FK to chunks is added in 002_pgvector_setup.sql
-- because the chunks table does not exist yet at this point.
create table flashcards (
  id               uuid    primary key default gen_random_uuid(),
  set_id           uuid    not null references sets(id) on delete cascade,
  source_chunk_id  uuid,
  question         text    not null,
  answer           text    not null,
  card_type        text    not null default 'qa'
                           check (card_type in ('qa', 'fill_blank', 'true_false')),
  difficulty       text    default 'remember'
                           check (difficulty in ('remember', 'understand', 'apply')),
  is_edited        boolean default false,
  created_at       timestamptz default now()
);

-- =========================
-- 4. chat_messages
-- =========================
create table chat_messages (
  id            uuid   primary key default gen_random_uuid(),
  set_id        uuid   not null references sets(id) on delete cascade,
  session_id    text   not null,
  role          text   not null check (role in ('user', 'assistant')),
  content       text   not null,
  cited_chunks  jsonb  default '[]'::jsonb,
  created_at    timestamptz default now()
);

-- ============================================================================
-- Indexes
-- ============================================================================
create index idx_sets_join_code          on sets(join_code);
create index idx_sources_set_id          on sources(set_id);
create index idx_flashcards_set_id       on flashcards(set_id);
create index idx_chat_messages_set_session on chat_messages(set_id, session_id);

-- ============================================================================
-- Row-Level Security
--
-- WARNING: These policies are fully permissive (allow all operations for
-- anonymous users). They MUST be tightened once authentication is added.
-- ============================================================================
alter table sets           enable row level security;
alter table sources        enable row level security;
alter table flashcards     enable row level security;
alter table chat_messages  enable row level security;

-- sets
create policy "Allow all access to sets"
  on sets for all
  using (true)
  with check (true);

-- sources
create policy "Allow all access to sources"
  on sources for all
  using (true)
  with check (true);

-- flashcards
create policy "Allow all access to flashcards"
  on flashcards for all
  using (true)
  with check (true);

-- chat_messages
create policy "Allow all access to chat_messages"
  on chat_messages for all
  using (true)
  with check (true);
