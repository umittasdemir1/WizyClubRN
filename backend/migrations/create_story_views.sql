-- Create story_views table to track which users have seen which stories
CREATE TABLE IF NOT EXISTS public.story_views (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    story_id UUID NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
    viewed_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, story_id)
);

-- RLS Policies
ALTER TABLE public.story_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own views"
    ON public.story_views
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own view history"
    ON public.story_views
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Story owners can see who viewed their stories"
    ON public.story_views
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.stories s
            WHERE s.id = story_views.story_id
            AND s.user_id = auth.uid()
        )
    );

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_story_views_user_story ON public.story_views(user_id, story_id);
