import { useMemo } from 'react';
import { Video } from '../../domain/entities/Video';
import { applyCounterSnapshotToVideo, useVideoCounterStore } from '../store/useVideoCounterStore';

export function useResolvedVideoCounters<T extends Video>(videos: T[]): T[] {
    const countersByVideoId = useVideoCounterStore((state) => state.countersByVideoId);

    return useMemo(
        () => videos.map((video) => applyCounterSnapshotToVideo(video, countersByVideoId) as T),
        [videos, countersByVideoId]
    );
}
