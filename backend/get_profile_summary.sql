-- Run this in Supabase SQL Editor to enable a single-call profile summary.
create or replace function public.get_profile_summary(
    target_user_id uuid,
    viewer_user_id uuid default null
)
returns table (
    id uuid,
    username text,
    full_name text,
    avatar_url text,
    bio text,
    country text,
    age integer,
    website text,
    is_verified boolean,
    followers_count integer,
    following_count integer,
    posts_count integer,
    instagram_url text,
    tiktok_url text,
    youtube_url text,
    x_url text,
    is_following boolean,
    has_stories boolean,
    has_unseen_story boolean
)
language sql
stable
security definer
set search_path = public
as $$
    with base as (
        select *
        from profiles
        where id = target_user_id
    ),
    viewer as (
        select coalesce(viewer_user_id, auth.uid()) as viewer_id
    ),
    active_stories as (
        select id
        from stories
        where user_id = target_user_id
          and expires_at > now()
    ),
    viewed as (
        select count(*)::int as viewed_count
        from story_views sv
        join active_stories s on s.id = sv.story_id
        join viewer v on true
        where sv.user_id = v.viewer_id
    )
    select
        b.id,
        b.username,
        b.full_name,
        b.avatar_url,
        b.bio,
        b.country,
        b.age,
        b.website,
        b.is_verified,
        b.followers_count,
        b.following_count,
        b.posts_count,
        b.instagram_url,
        b.tiktok_url,
        b.youtube_url,
        b.x_url,
        case
            when v.viewer_id is null then false
            else exists (
                select 1
                from follows f
                where f.follower_id = v.viewer_id
                  and f.following_id = target_user_id
            )
        end as is_following,
        exists (select 1 from active_stories) as has_stories,
        case
            when not exists (select 1 from active_stories) then false
            when v.viewer_id is null then true
            else (select viewed_count from viewed) < (select count(*) from active_stories)
        end as has_unseen_story
    from base b
    cross join viewer v;
$$;

grant execute on function public.get_profile_summary(uuid, uuid) to anon, authenticated;
