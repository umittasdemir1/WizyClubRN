import { Video } from '../../../../domain/entities/Video';
import { getVideoUrl } from '../../../../core/utils/videoUrl';

/**
 * Validates if a video object is a playable feed video item.
 * Excludes carousels and ensures a valid video URL exists.
 */
export const isFeedVideoItem = (video?: Video | null): boolean => {
    if (!video) return false;
    if (video.postType === 'carousel') return false;

    return Boolean(getVideoUrl(video));
};
