-- Create video_views table to track watch history
CREATE TABLE IF NOT EXISTS public.video_views (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    video_id UUID NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
    viewed_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE (user_id, video_id)
);

ALTER TABLE public.video_views ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can insert their own video views" ON public.video_views;
CREATE POLICY "Users can insert their own video views"
    ON public.video_views
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view their own video history" ON public.video_views;
CREATE POLICY "Users can view their own video history"
    ON public.video_views
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_video_views_user_video ON public.video_views(user_id, video_id);
CREATE INDEX IF NOT EXISTS idx_video_views_user_viewed_at ON public.video_views(user_id, viewed_at DESC);
