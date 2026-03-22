-- Add all commercial columns in one go
ALTER TABLE videos 
ADD COLUMN IF NOT EXISTS brand_name TEXT,
ADD COLUMN IF NOT EXISTS brand_url TEXT,
ADD COLUMN IF NOT EXISTS is_commercial BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS commercial_type TEXT;

-- Verify changes
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'videos' 
AND column_name IN ('brand_name', 'brand_url', 'is_commercial', 'commercial_type');
