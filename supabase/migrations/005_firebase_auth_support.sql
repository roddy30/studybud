-- ============================================================================
-- 005_firebase_auth_support.sql
--
-- Updates quiz_scores to accept Firebase user IDs (strings) instead of UUIDs,
-- and enables score submission for authenticated Firebase users.
-- ============================================================================

-- 1. Drop foreign key constraint on auth.users(id) and convert user_id to text
alter table quiz_scores drop constraint if exists quiz_scores_user_id_fkey;
alter table quiz_scores alter column user_id type text;

-- 2. Allow insert and update on quiz_scores
drop policy if exists "Authenticated users can insert quiz_scores" on quiz_scores;
drop policy if exists "Authenticated users can update their own score" on quiz_scores;
drop policy if exists "Allow insert on quiz_scores" on quiz_scores;
drop policy if exists "Allow update on quiz_scores" on quiz_scores;

create policy "Allow insert on quiz_scores"
  on quiz_scores for insert
  with check (true);

create policy "Allow update on quiz_scores"
  on quiz_scores for update
  using (true)
  with check (true);
