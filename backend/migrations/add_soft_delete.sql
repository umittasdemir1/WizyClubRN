-- Add deleted_at column for Soft Delete
ALTER TABLE videos 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- Create an index for faster filtering of non-deleted items
CREATE INDEX IF NOT EXISTS idx_videos_deleted_at ON videos(deleted_at);

-- Optional: Update existing rows to have NULL (default does this, but being explicit)
UPDATE videos SET deleted_at = NULL WHERE deleted_at IS NULL;
