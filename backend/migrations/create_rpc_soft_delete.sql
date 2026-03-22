-- Function to Soft Delete a video (Bypassing RLS)
create or replace function soft_delete_video(video_id uuid)
returns void
language plpgsql
security definer -- Writes with owner privileges (admin)
as $$
begin
  update videos
  set deleted_at = now()
  where id = video_id;
end;
$$;
