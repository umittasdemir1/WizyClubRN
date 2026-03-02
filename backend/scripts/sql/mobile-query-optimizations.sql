-- Mobile query optimization bundle
-- Apply this whole file once in Supabase SQL Editor.

-- Ensure watch-history table exists for activity history read-models.
CREATE TABLE IF NOT EXISTS public.video_views (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    video_id UUID NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
    viewed_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE (user_id, video_id)
);

ALTER TABLE public.video_views ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can insert their own video views" ON public.video_views;
CREATE POLICY "Users can insert their own video views"
    ON public.video_views
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view their own video history" ON public.video_views;
CREATE POLICY "Users can view their own video history"
    ON public.video_views
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_video_views_user_video ON public.video_views(user_id, video_id);
CREATE INDEX IF NOT EXISTS idx_video_views_user_viewed_at ON public.video_views(user_id, viewed_at DESC);

-- Feed read model RPC
-- Replaces the current 4-query mobile feed waterfall:
-- 1. videos + profiles + post_tags
-- 2. likes
-- 3. saves
-- 4. follows
create or replace function get_feed_page_v1(
  p_limit integer default 10,
  p_user_id text default null,
  p_author_id text default null,
  p_cursor_created_at timestamptz default null,
  p_cursor_id uuid default null
)
returns table (
  id uuid,
  user_id text,
  video_url text,
  thumbnail_url text,
  description text,
  likes_count integer,
  views_count integer,
  shares_count integer,
  saves_count integer,
  shops_count integer,
  created_at timestamptz,
  sprite_url text,
  width integer,
  height integer,
  is_commercial boolean,
  brand_name text,
  brand_url text,
  commercial_type text,
  music_name text,
  music_author text,
  media_urls jsonb,
  post_type text,
  profiles jsonb,
  post_tags jsonb,
  is_liked boolean,
  is_saved boolean,
  is_following boolean
)
language sql
stable
as $$
  with base_videos as (
    select v.*
    from videos v
    where v.deleted_at is null
      and (p_author_id is null or v.user_id::text = p_author_id)
      and (
        p_cursor_created_at is null
        or p_cursor_id is null
        or v.created_at < p_cursor_created_at
        or (v.created_at = p_cursor_created_at and v.id < p_cursor_id)
      )
    order by v.created_at desc, v.id desc
    limit greatest(coalesce(p_limit, 10), 1)
  ),
  aggregated_tags as (
    select
      pt.video_id,
      jsonb_agg(
        jsonb_build_object(
          'tagged_user_id', pt.tagged_user_id,
          'profiles', to_jsonb(tagged_profile)
        )
        order by pt.created_at asc nulls last, pt.id asc
      ) as post_tags
    from post_tags pt
    left join profiles tagged_profile on tagged_profile.id::text = pt.tagged_user_id::text
    where pt.video_id in (select id from base_videos)
    group by pt.video_id
  )
  select
    v.id,
    v.user_id::text as user_id,
    v.video_url,
    v.thumbnail_url,
    v.description,
    coalesce(v.likes_count, 0)::integer as likes_count,
    coalesce(v.views_count, 0)::integer as views_count,
    coalesce(v.shares_count, 0)::integer as shares_count,
    coalesce(v.saves_count, 0)::integer as saves_count,
    coalesce(v.shops_count, 0)::integer as shops_count,
    v.created_at,
    v.sprite_url,
    v.width,
    v.height,
    v.is_commercial,
    v.brand_name,
    v.brand_url,
    v.commercial_type,
    v.music_name,
    v.music_author,
    v.media_urls,
    v.post_type::text as post_type,
    to_jsonb(author_profile) as profiles,
    coalesce(aggregated_tags.post_tags, '[]'::jsonb) as post_tags,
    coalesce(
      exists(
        select 1
        from likes l
        where p_user_id is not null
          and l.user_id::text = p_user_id
          and l.video_id = v.id
      ),
      false
    ) as is_liked,
    coalesce(
      exists(
        select 1
        from saves s
        where p_user_id is not null
          and s.user_id::text = p_user_id
          and s.video_id = v.id
      ),
      false
    ) as is_saved,
    coalesce(
      exists(
        select 1
        from follows f
        where p_user_id is not null
          and f.follower_id::text = p_user_id
          and f.following_id::text = v.user_id::text
      ),
      false
    ) as is_following
  from base_videos v
  left join profiles author_profile on author_profile.id::text = v.user_id::text
  left join aggregated_tags on aggregated_tags.video_id = v.id
  order by v.created_at desc, v.id desc;
$$;

-- User activity read model RPC
-- Collapses:
-- 1. likes/saves/history lookup
-- 2. videos lookup
-- 3. likes state lookup
-- 4. saves state lookup
-- 5. follows state lookup
create or replace function get_user_interaction_v1(
  p_user_id text,
  p_activity_type text default 'likes'
)
returns table (
  activity_at timestamptz,
  id uuid,
  user_id text,
  video_url text,
  thumbnail_url text,
  description text,
  likes_count integer,
  views_count integer,
  shares_count integer,
  saves_count integer,
  shops_count integer,
  created_at timestamptz,
  sprite_url text,
  width integer,
  height integer,
  is_commercial boolean,
  brand_name text,
  brand_url text,
  commercial_type text,
  music_name text,
  music_author text,
  media_urls jsonb,
  post_type text,
  profiles jsonb,
  post_tags jsonb,
  is_liked boolean,
  is_saved boolean,
  is_following boolean
)
language sql
stable
as $$
  with raw_activity as (
    select l.video_id, l.created_at as activity_at
    from likes l
    where p_activity_type = 'likes'
      and l.user_id::text = p_user_id
      and l.video_id is not null

    union all

    select s.video_id, s.created_at as activity_at
    from saves s
    where p_activity_type = 'saved'
      and s.user_id::text = p_user_id

    union all

    select vv.video_id, vv.viewed_at as activity_at
    from video_views vv
    where p_activity_type = 'history'
      and vv.user_id::text = p_user_id
      and vv.video_id is not null
  ),
  latest_activity as (
    select distinct on (ra.video_id)
      ra.video_id,
      ra.activity_at
    from raw_activity ra
    order by ra.video_id, ra.activity_at desc
  ),
  ordered_activity as (
    select la.video_id, la.activity_at
    from latest_activity la
    order by la.activity_at desc, la.video_id desc
  ),
  aggregated_tags as (
    select
      pt.video_id,
      jsonb_agg(
        jsonb_build_object(
          'tagged_user_id', pt.tagged_user_id,
          'profiles', to_jsonb(tagged_profile)
        )
        order by pt.created_at asc nulls last, pt.id asc
      ) as post_tags
    from post_tags pt
    left join profiles tagged_profile on tagged_profile.id::text = pt.tagged_user_id::text
    where pt.video_id in (select video_id from ordered_activity)
    group by pt.video_id
  )
  select
    oa.activity_at,
    v.id,
    v.user_id::text as user_id,
    v.video_url,
    v.thumbnail_url,
    v.description,
    coalesce(v.likes_count, 0)::integer as likes_count,
    coalesce(v.views_count, 0)::integer as views_count,
    coalesce(v.shares_count, 0)::integer as shares_count,
    coalesce(v.saves_count, 0)::integer as saves_count,
    coalesce(v.shops_count, 0)::integer as shops_count,
    v.created_at,
    v.sprite_url,
    v.width,
    v.height,
    v.is_commercial,
    v.brand_name,
    v.brand_url,
    v.commercial_type,
    v.music_name,
    v.music_author,
    v.media_urls,
    v.post_type::text as post_type,
    to_jsonb(author_profile) as profiles,
    coalesce(aggregated_tags.post_tags, '[]'::jsonb) as post_tags,
    coalesce(
      exists(
        select 1
        from likes l
        where l.user_id::text = p_user_id
          and l.video_id = v.id
      ),
      false
    ) as is_liked,
    coalesce(
      exists(
        select 1
        from saves s
        where s.user_id::text = p_user_id
          and s.video_id = v.id
      ),
      false
    ) as is_saved,
    coalesce(
      exists(
        select 1
        from follows f
        where f.follower_id::text = p_user_id
          and f.following_id::text = v.user_id::text
      ),
      false
    ) as is_following
  from ordered_activity oa
  join videos v on v.id = oa.video_id
  left join profiles author_profile on author_profile.id::text = v.user_id::text
  left join aggregated_tags on aggregated_tags.video_id = v.id
  where v.deleted_at is null
  order by oa.activity_at desc, v.created_at desc, v.id desc;
$$;

-- Hashtag search read model RPC
-- Replaces client-side two-query aggregation for hashtag search.
create or replace function search_hashtags_v1(
  p_query text,
  p_limit integer default 30
)
returns table (
  id uuid,
  name text,
  post_count bigint,
  click_count integer,
  search_count integer,
  score numeric
)
language sql
stable
as $$
  with matched_hashtags as (
    select
      h.id,
      h.name,
      coalesce(h.click_count, 0) as click_count,
      coalesce(h.search_count, 0) as search_count
    from hashtags h
    where h.name ilike ('%' || trim(leading '#' from coalesce(p_query, '')) || '%')
    order by h.click_count desc nulls last, h.name asc
    limit greatest(coalesce(p_limit, 30), 1)
  ),
  usage_counts as (
    select
      vh.hashtag_id,
      count(*)::bigint as post_count
    from video_hashtags vh
    where vh.hashtag_id in (select id from matched_hashtags)
    group by vh.hashtag_id
  )
  select
    mh.id,
    mh.name,
    coalesce(uc.post_count, 0) as post_count,
    mh.click_count,
    mh.search_count,
    (
      coalesce(uc.post_count, 0)::numeric * 1.0
      + mh.click_count::numeric * 0.5
      + mh.search_count::numeric * 0.3
    ) as score
  from matched_hashtags mh
  left join usage_counts uc on uc.hashtag_id = mh.id
  order by score desc, mh.name asc;
$$;

-- Write-optimized interaction toggles
-- Replaces read-then-write mutation flow for likes and saves.
-- These functions detect whether the underlying user_id column is text or uuid
-- so they work across historical schema variants.
create or replace function toggle_like_v1(
  p_user_id text,
  p_video_id uuid default null,
  p_story_id uuid default null
)
returns boolean
language plpgsql
as $$
declare
  deleted_count integer := 0;
  user_id_type text;
begin
  if (p_video_id is null and p_story_id is null) or (p_video_id is not null and p_story_id is not null) then
    raise exception 'toggle_like_v1 expects exactly one target id';
  end if;

  select c.data_type
  into user_id_type
  from information_schema.columns c
  where c.table_schema = 'public'
    and c.table_name = 'likes'
    and c.column_name = 'user_id';

  if user_id_type = 'uuid' then
    if p_video_id is not null then
      execute 'delete from likes where user_id = $1::uuid and video_id = $2'
      using p_user_id, p_video_id;
    else
      execute 'delete from likes where user_id = $1::uuid and story_id = $2'
      using p_user_id, p_story_id;
    end if;
  else
    if p_video_id is not null then
      execute 'delete from likes where user_id::text = $1 and video_id = $2'
      using p_user_id, p_video_id;
    else
      execute 'delete from likes where user_id::text = $1 and story_id = $2'
      using p_user_id, p_story_id;
    end if;
  end if;

  get diagnostics deleted_count = row_count;
  if deleted_count > 0 then
    return false;
  end if;

  begin
    if user_id_type = 'uuid' then
      execute 'insert into likes (user_id, video_id, story_id) values ($1::uuid, $2, $3)'
      using p_user_id, p_video_id, p_story_id;
    else
      execute 'insert into likes (user_id, video_id, story_id) values ($1, $2, $3)'
      using p_user_id, p_video_id, p_story_id;
    end if;
    return true;
  exception
    when unique_violation then
      return true;
  end;
end;
$$;

create or replace function toggle_save_v1(
  p_user_id text,
  p_video_id uuid
)
returns boolean
language plpgsql
as $$
declare
  deleted_count integer := 0;
  user_id_type text;
begin
  select c.data_type
  into user_id_type
  from information_schema.columns c
  where c.table_schema = 'public'
    and c.table_name = 'saves'
    and c.column_name = 'user_id';

  if user_id_type = 'uuid' then
    execute 'delete from saves where user_id = $1::uuid and video_id = $2'
    using p_user_id, p_video_id;
  else
    execute 'delete from saves where user_id::text = $1 and video_id = $2'
    using p_user_id, p_video_id;
  end if;

  get diagnostics deleted_count = row_count;
  if deleted_count > 0 then
    return false;
  end if;

  begin
    if user_id_type = 'uuid' then
      execute 'insert into saves (user_id, video_id) values ($1::uuid, $2)'
      using p_user_id, p_video_id;
    else
      execute 'insert into saves (user_id, video_id) values ($1, $2)'
      using p_user_id, p_video_id;
    end if;
    return true;
  exception
    when unique_violation then
      return true;
  end;
end;
$$;
