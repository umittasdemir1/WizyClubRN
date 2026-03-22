-- Add commercial columns to videos table
ALTER TABLE videos 
ADD COLUMN IF NOT EXISTS brand_name TEXT,
ADD COLUMN IF NOT EXISTS brand_url TEXT,
ADD COLUMN IF NOT EXISTS is_commercial BOOLEAN DEFAULT false;

-- Policy update (ensure these are writable if needed, usually open for this project)
-- (Assuming existing policy "Authenticated users can upload" covers it)
