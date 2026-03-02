-- Hotfix for toggle RPCs across text/uuid schema variants.

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
