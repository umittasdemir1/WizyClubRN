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
