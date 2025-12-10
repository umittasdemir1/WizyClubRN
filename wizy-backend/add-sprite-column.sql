-- Add sprite_url column to videos table for seekbar thumbnails
ALTER TABLE videos ADD COLUMN IF NOT EXISTS sprite_url TEXT;

-- Update comment
COMMENT ON COLUMN videos.sprite_url IS 'URL to sprite sheet image for seekbar thumbnail scrubbing (generated from video at 2s intervals)';
