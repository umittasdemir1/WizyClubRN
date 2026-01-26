-- Function to Restore a video (Bypassing RLS)
create or replace function restore_video(video_id uuid)
returns void
language plpgsql
security definer -- Writes with owner privileges (admin)
as $$
begin
  update videos
  set deleted_at = null
  where id = video_id;
end;
$$;
