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
  location_name text,
  location_address text,
  location_latitude double precision,
  location_longitude double precision,
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
    v.location_name,
    v.location_address,
    v.location_latitude,
    v.location_longitude,
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
