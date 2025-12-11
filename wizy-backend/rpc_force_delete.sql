-- Run this in your Supabase SQL Editor to enable guaranteed deletion

-- 1. Create a function that bypasses RLS (Row Level Security)
CREATE OR REPLACE FUNCTION force_delete_video(vid uuid)
RETURNS void AS $$
BEGIN
  DELETE FROM videos WHERE id = vid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Ensure RLS Policy exists for normal deletes (Optional but updated)
-- DROP POLICY IF EXISTS "Users can delete own videos" ON videos;
-- CREATE POLICY "Users can delete own videos" ON videos FOR DELETE USING (auth.uid() = user_id);
