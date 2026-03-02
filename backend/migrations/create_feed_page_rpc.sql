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
