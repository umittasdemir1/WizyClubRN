-- Add commercial_type column
ALTER TABLE videos 
ADD COLUMN IF NOT EXISTS commercial_type TEXT;
