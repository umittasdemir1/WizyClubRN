-- Mobile query optimization: first index tuning pass
-- Apply during a low-traffic window if possible.
-- Goal:
-- 1) reduce get_user_interaction_v1(saved/history) cost
-- 2) harden feed read-model indexes for larger datasets

-- Activity path: likes
CREATE INDEX IF NOT EXISTS idx_likes_user_created_video
ON likes(user_id, created_at DESC, video_id)
WHERE video_id IS NOT NULL;

-- Activity path: saves
CREATE INDEX IF NOT EXISTS idx_saves_user_created_video
ON saves(user_id, created_at DESC, video_id);

-- Activity path: post tag aggregation by video
CREATE INDEX IF NOT EXISTS idx_post_tags_video_created_id
ON post_tags(video_id, created_at, id)
WHERE video_id IS NOT NULL;

-- Feed path: active videos ordered by recency
CREATE INDEX IF NOT EXISTS idx_videos_active_created_id
ON videos(created_at DESC, id DESC)
WHERE deleted_at IS NULL;

-- Feed path: author scoped active videos ordered by recency
CREATE INDEX IF NOT EXISTS idx_videos_active_user_created_id
ON videos(user_id, created_at DESC, id DESC)
WHERE deleted_at IS NULL;

-- Re-run measurement after applying:
-- - get_feed_page_v1
-- - get_user_interaction_v1(saved)
-- - get_user_interaction_v1(history)
-- - search_hashtags_v1
