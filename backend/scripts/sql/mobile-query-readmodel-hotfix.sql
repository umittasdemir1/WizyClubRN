-- Read-model hotfix bundle
-- Apply after the initial mobile-query-optimizations.sql rollout.
-- This adds history support to get_user_interaction_v1
-- and creates search_hashtags_v1 for server-side hashtag aggregation.

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
