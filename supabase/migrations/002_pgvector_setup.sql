-- ============================================================================
-- 002_pgvector_setup.sql
--
-- Sets up the vector search infrastructure for StudyBud:
--   1. Enables the pgvector extension
--   2. Creates the chunks table (source text segments + embeddings)
--   3. Creates an HNSW index for fast cosine-similarity search
--   4. Creates the match_chunks RPC function used by the RAG pipeline
--   5. Adds the deferred FK from flashcards.source_chunk_id -> chunks.id
--   6. Enables RLS with a permissive policy
-- ============================================================================

-- =========================
-- 1. Enable pgvector
-- =========================
create extension if not exists vector with schema extensions;

-- =========================
-- 2. chunks table
-- =========================
create table chunks (
  id          uuid         primary key default gen_random_uuid(),
  source_id   uuid         not null references sources(id) on delete cascade,
  content     text         not null,
  embedding   vector(768)  not null,
  metadata    jsonb        default '{}'::jsonb,  -- page_number, timestamp_start, timestamp_end, chunk_index
  created_at  timestamptz  default now()
);

-- =========================
-- 3. HNSW index for cosine similarity
-- =========================
create index chunks_embedding_hnsw_idx
  on chunks
  using hnsw (embedding vector_cosine_ops);

-- =========================
-- 4. Index on source_id for FK look-ups
-- =========================
create index idx_chunks_source_id on chunks(source_id);

-- =========================
-- 5. Add deferred FK: flashcards.source_chunk_id -> chunks.id
--    (chunks table was not yet available in 001)
-- =========================
alter table flashcards
  add constraint fk_flashcards_source_chunk
  foreign key (source_chunk_id)
  references chunks(id)
  on delete set null;

-- =========================
-- 6. match_chunks RPC
--    Returns the top-N most similar chunks for a given set,
--    filtered by a minimum cosine-similarity threshold.
-- =========================
create or replace function match_chunks(
  query_embedding vector(768),
  filter_set_id uuid,
  match_threshold float default 0.5,
  match_count int default 6
)
returns table (
  id         uuid,
  source_id  uuid,
  content    text,
  metadata   jsonb,
  similarity float
)
language plpgsql
as $$
begin
  return query
  select
    c.id,
    c.source_id,
    c.content,
    c.metadata,
    1 - (c.embedding <=> query_embedding) as similarity
  from chunks c
  join sources s on s.id = c.source_id
  where s.set_id = filter_set_id
    and 1 - (c.embedding <=> query_embedding) > match_threshold
  order by c.embedding <=> query_embedding
  limit match_count;
end;
$$;

-- =========================
-- 7. Row-Level Security
--
-- WARNING: Fully permissive — tighten once authentication is added.
-- =========================
alter table chunks enable row level security;

create policy "Allow all access to chunks"
  on chunks for all
  using (true)
  with check (true);
