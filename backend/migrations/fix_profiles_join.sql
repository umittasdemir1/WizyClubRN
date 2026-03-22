-- 1. FIRST: Fix the orphaned user IDs so they point to a valid profile
-- (PostgreSQL checks data BEFORE adding the constraint, so this MUST happen first)
UPDATE videos 
SET user_id = 'wizyclub-official'
WHERE user_id NOT IN (SELECT id FROM profiles);

-- 2. SECOND: Now that all data is valid, create the relationship
ALTER TABLE videos 
ADD CONSTRAINT fk_videos_profiles 
FOREIGN KEY (user_id) 
REFERENCES profiles(id)
ON DELETE SET NULL;
