-- Create post_tags table for tagging people in videos and stories
CREATE TABLE IF NOT EXISTS post_tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    video_id UUID REFERENCES videos(id) ON DELETE CASCADE,
    story_id UUID REFERENCES stories(id) ON DELETE CASCADE,
    tagged_user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT post_tags_one_target CHECK (
        (video_id IS NOT NULL AND story_id IS NULL) OR
        (video_id IS NULL AND story_id IS NOT NULL)
    )
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_post_tags_video_user ON post_tags(video_id, tagged_user_id) WHERE video_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_post_tags_story_user ON post_tags(story_id, tagged_user_id) WHERE story_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_post_tags_video_id ON post_tags(video_id);
CREATE INDEX IF NOT EXISTS idx_post_tags_story_id ON post_tags(story_id);
CREATE INDEX IF NOT EXISTS idx_post_tags_tagged_user ON post_tags(tagged_user_id);

ALTER TABLE post_tags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Post tags are publicly readable" ON post_tags;
CREATE POLICY "Post tags are publicly readable"
    ON post_tags FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can manage own post tags" ON post_tags;
CREATE POLICY "Users can manage own post tags"
    ON post_tags FOR ALL USING (true);
