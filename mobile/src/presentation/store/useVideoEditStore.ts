import { create } from 'zustand';
import { Video } from '../../domain/entities/Video';

interface VideoEditState {
    descriptionByVideoId: Record<string, string>;
    upsertDescription: (videoId: string, description: string) => void;
    clearDescription: (videoId: string) => void;
    reset: () => void;
}

export const useVideoEditStore = create<VideoEditState>((set, get) => ({
    descriptionByVideoId: {},

    upsertDescription: (videoId, description) => {
        if (!videoId) return;
        const currentValue = get().descriptionByVideoId[videoId];
        if (currentValue === description) return;

        set((state) => ({
            descriptionByVideoId: {
                ...state.descriptionByVideoId,
                [videoId]: description,
            },
        }));
    },

    clearDescription: (videoId) => {
        if (!videoId) return;
        if (!(videoId in get().descriptionByVideoId)) return;

        set((state) => {
            const next = { ...state.descriptionByVideoId };
            delete next[videoId];
            return { descriptionByVideoId: next };
        });
    },

    reset: () => {
        if (Object.keys(get().descriptionByVideoId).length === 0) return;
        set({ descriptionByVideoId: {} });
    },
}));

export const applyDescriptionOverrideToVideo = <T extends Video>(
    video: T,
    descriptionByVideoId: Record<string, string>
): T => {
    const overrideDescription = descriptionByVideoId[video.id];
    if (typeof overrideDescription !== 'string') return video;
    if ((video.description || '') === overrideDescription) return video;

    return {
        ...video,
        description: overrideDescription,
    };
};

export const applyDescriptionOverridesToVideos = <T extends Video>(
    videos: T[],
    descriptionByVideoId: Record<string, string>
): T[] => {
    let changed = false;
    const nextVideos = videos.map((video) => {
        const nextVideo = applyDescriptionOverrideToVideo(video, descriptionByVideoId);
        if (nextVideo !== video) changed = true;
        return nextVideo;
    });
    return changed ? nextVideos : videos;
};
