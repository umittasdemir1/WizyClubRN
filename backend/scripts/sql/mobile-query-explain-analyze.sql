-- Mobile query measurement playbook
-- Run these blocks one by one in Supabase SQL Editor.
-- Goal: inspect the real execution plans of the new read-model RPCs before adding indexes.

set statement_timeout = '30s';

-- 1. Feed RPC (personalized path)
-- Checks the hottest mobile read path under a real user context.
explain (analyze, buffers, verbose, format text)
with sample_feed_user as (
  select v.user_id::text as user_id
  from videos v
  where v.deleted_at is null
  order by v.created_at desc
  limit 1
)
select *
from get_feed_page_v1(
  10,
  (select user_id from sample_feed_user),
  null,
  null,
  null
);

-- 2. Activity RPC (saved mode)
-- Verifies the common saved-videos profile path.
explain (analyze, buffers, verbose, format text)
with sample_saved_user as (
  select s.user_id::text as user_id
  from saves s
  order by s.created_at desc
  limit 1
)
select *
from get_user_interaction_v1(
  (select user_id from sample_saved_user),
  'saved'
);

-- 3. Activity RPC (history mode)
-- Verifies watch-history after the history read-model rollout.
explain (analyze, buffers, verbose, format text)
with sample_history_user as (
  select vv.user_id::text as user_id
  from video_views vv
  order by vv.viewed_at desc
  limit 1
)
select *
from get_user_interaction_v1(
  (select user_id from sample_history_user),
  'history'
);

-- 4. Hashtag search RPC
-- Checks search aggregation cost and whether the new server-side scoring is cheap enough.
explain (analyze, buffers, verbose, format text)
with sample_query as (
  select left(h.name, greatest(1, least(length(h.name), 3))) as q
  from hashtags h
  where length(h.name) > 0
  order by h.click_count desc nulls last, h.search_count desc nulls last
  limit 1
)
select *
from search_hashtags_v1(
  (select q from sample_query),
  10
);

-- 5. Optional: confirm index landscape before tuning
select schemaname, tablename, indexname, indexdef
from pg_indexes
where schemaname = 'public'
  and tablename in ('videos', 'stories', 'likes', 'saves', 'follows', 'story_views', 'video_views', 'hashtags', 'video_hashtags')
order by tablename, indexname;

-- 6. Optional: pg_stat_statements quick look
-- First run the check below. Only run the next SELECT if you get a row back.
select extname
from pg_extension
where extname = 'pg_stat_statements';

-- Run only if the check above returns pg_stat_statements.
select
  query,
  calls,
  total_exec_time,
  mean_exec_time,
  rows
from pg_stat_statements
where query ilike '%get_feed_page_v1%'
   or query ilike '%get_user_interaction_v1%'
   or query ilike '%search_hashtags_v1%'
order by total_exec_time desc
limit 20;

reset statement_timeout;
