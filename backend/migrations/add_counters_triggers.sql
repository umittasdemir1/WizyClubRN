DROP TRIGGER IF EXISTS on_like_change ON public.likes;
DROP TRIGGER IF EXISTS trigger_update_likes_count ON public.likes;
DROP TRIGGER IF EXISTS sync_likes_counter ON public.likes;
DROP TRIGGER IF EXISTS on_like_added ON public.likes;
DROP TRIGGER IF EXISTS on_like_removed ON public.likes;

DROP TRIGGER IF EXISTS on_save_change ON public.saves;
DROP TRIGGER IF EXISTS trigger_update_saves_count ON public.saves;
DROP TRIGGER IF EXISTS sync_saves_counter ON public.saves;
DROP TRIGGER IF EXISTS on_save_added ON public.saves;
DROP TRIGGER IF EXISTS on_save_removed ON public.saves;

DROP TRIGGER IF EXISTS on_follow_change ON public.follows;
DROP TRIGGER IF EXISTS sync_follow_counters ON public.follows;
DROP TRIGGER IF EXISTS on_video_post_change ON public.videos;
DROP TRIGGER IF EXISTS sync_video_posts_counter ON public.videos;

CREATE OR REPLACE FUNCTION public.increment_video_counter(video_id UUID, counter_column TEXT)
RETURNS void AS $$
BEGIN
    EXECUTE format('UPDATE public.videos SET %I = %I + 1 WHERE id = $1', counter_column, counter_column)
    USING video_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.handle_counters()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_TABLE_NAME = 'likes') THEN
        IF (TG_OP = 'INSERT') THEN
            UPDATE public.videos SET likes_count = likes_count + 1 WHERE id = NEW.video_id;
        ELSIF (TG_OP = 'DELETE') THEN
            UPDATE public.videos SET likes_count = GREATEST(0, likes_count - 1) WHERE id = OLD.video_id;
        END IF;
    ELSIF (TG_TABLE_NAME = 'saves') THEN
        IF (TG_OP = 'INSERT') THEN
            UPDATE public.videos SET saves_count = saves_count + 1 WHERE id = NEW.video_id;
        ELSIF (TG_OP = 'DELETE') THEN
            UPDATE public.videos SET saves_count = GREATEST(0, saves_count - 1) WHERE id = OLD.video_id;
        END IF;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER sync_likes_counter
    AFTER INSERT OR DELETE ON public.likes
    FOR EACH ROW EXECUTE FUNCTION public.handle_counters();

CREATE TRIGGER sync_saves_counter
    AFTER INSERT OR DELETE ON public.saves
    FOR EACH ROW EXECUTE FUNCTION public.handle_counters();

CREATE OR REPLACE FUNCTION public.handle_social_counters()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_TABLE_NAME = 'follows') THEN
        IF (TG_OP = 'INSERT') THEN
            UPDATE public.profiles SET followers_count = followers_count + 1 WHERE id = NEW.following_id;
            UPDATE public.profiles SET following_count = following_count + 1 WHERE id = NEW.follower_id;
        ELSIF (TG_OP = 'DELETE') THEN
            UPDATE public.profiles SET followers_count = GREATEST(0, followers_count - 1) WHERE id = OLD.following_id;
            UPDATE public.profiles SET following_count = GREATEST(0, following_count - 1) WHERE id = OLD.follower_id;
        END IF;
    ELSIF (TG_TABLE_NAME = 'videos') THEN
        IF (TG_OP = 'INSERT') THEN
            UPDATE public.profiles SET posts_count = posts_count + 1 WHERE id = NEW.user_id;
        ELSIF (TG_OP = 'DELETE') THEN
            UPDATE public.profiles SET posts_count = GREATEST(0, posts_count - 1) WHERE id = OLD.user_id;
        END IF;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER sync_follow_counters
    AFTER INSERT OR DELETE ON public.follows
    FOR EACH ROW EXECUTE FUNCTION public.handle_social_counters();

CREATE TRIGGER sync_video_posts_counter
    AFTER INSERT OR DELETE ON public.videos
    FOR EACH ROW EXECUTE FUNCTION public.handle_social_counters();