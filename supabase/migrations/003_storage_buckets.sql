-- ============================================================================
-- 003_storage_buckets.sql
--
-- Creates the Supabase Storage bucket used for PDF uploads and sets
-- permissive object-level policies for v1 (no auth).
--
-- WARNING: These policies allow unauthenticated uploads and reads.
-- They MUST be tightened once authentication is added.
-- ============================================================================

-- =========================
-- 1. Create the storage bucket
-- =========================
insert into storage.buckets (id, name, public)
values ('source-files', 'source-files', false);

-- =========================
-- 2. Storage object policies
-- =========================

-- Allow public uploads (insert) to the source-files bucket
create policy "Allow public uploads"
  on storage.objects
  for insert
  with check (bucket_id = 'source-files');

-- Allow public reads (select) from the source-files bucket
create policy "Allow public reads"
  on storage.objects
  for select
  using (bucket_id = 'source-files');
