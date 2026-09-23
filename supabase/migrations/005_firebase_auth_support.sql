-- ============================================================================
-- 005_firebase_auth_support.sql
--
-- Drops dependent policies first, then updates quiz_scores user_id to text,
-- and recreates permissive insert/update policies for Firebase users.
-- ============================================================================

-- 1. Drop existing policies first (required by Postgres before altering column)
drop policy if exists "Authenticated users can insert quiz_scores" on quiz_scores;
drop policy if exists "Authenticated users can update their own score" on quiz_scores;
drop policy if exists "Allow insert on quiz_scores" on quiz_scores;
drop policy if exists "Allow update on quiz_scores" on quiz_scores;

-- 2. Drop foreign key constraint and convert user_id to text
alter table quiz_scores drop constraint if exists quiz_scores_user_id_fkey;
alter table quiz_scores alter column user_id type text;

-- 3. Recreate policies for quiz scores
create policy "Allow insert on quiz_scores"
  on quiz_scores for insert
  with check (true);

create policy "Allow update on quiz_scores"
  on quiz_scores for update
  using (true)
  with check (true);
