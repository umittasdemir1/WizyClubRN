import { useCallback, useEffect, useState } from 'react';
import { Video as VideoEntity } from '../../domain/entities/Video';
import { VideoCacheService } from '../../data/services/VideoCacheService';
import { isVideoCacheDisabled } from '../../core/utils/videoCacheToggle';

interface UseVideoSourceResult {
    videoSource: any;
    isSourceReady: boolean;
    fallbackToNetwork: () => void;
}

export function useVideoSource(video: VideoEntity, shouldLoad: boolean): UseVideoSourceResult {
    const [videoSource, setVideoSource] = useState<any>(null);
    const [isSourceReady, setIsSourceReady] = useState(false);

    const fallbackToNetwork = useCallback(() => {
        if (typeof video.videoUrl === 'string') {
            setVideoSource({ uri: video.videoUrl });
        } else {
            setVideoSource(video.videoUrl);
        }
        setIsSourceReady(true);
    }, [video.videoUrl]);

    useEffect(() => {
        let isCancelled = false;

        const initVideoSource = async () => {
            if (!shouldLoad) {
                setVideoSource(null);
                setIsSourceReady(false);
                return;
            }

            setIsSourceReady(false);

            if (typeof video.videoUrl !== 'string') {
                setVideoSource(video.videoUrl);
                setIsSourceReady(true);
                return;
            }

            if (isVideoCacheDisabled()) {
                setVideoSource({ uri: video.videoUrl });
                setIsSourceReady(true);
                return;
            }

            // Memory cache check (synchronous, instant)
            const memoryCached = VideoCacheService.getMemoryCachedPath(video.videoUrl);
            if (memoryCached) {
                console.log(`[VideoTransition] 🚀 Memory cache HIT: ${video.id}`);
                setVideoSource({ uri: memoryCached });
                setIsSourceReady(true);
                return;
            }

            // Disk cache check (async, fast) before falling back to network
            try {
                const diskCached = await VideoCacheService.getCachedVideoPath(video.videoUrl);
                if (!isCancelled && diskCached) {
                    console.log(`[VideoTransition] ⚡ Disk cache HIT: ${video.id}`);
                    setVideoSource({ uri: diskCached });
                    setIsSourceReady(true);
                    return;
                }
            } catch {
                // Ignore cache lookup failures and fall back to network.
            }

            if (isCancelled) return;

            console.log(`[VideoTransition] 🌐 Network source: ${video.id}`);
            setVideoSource({ uri: video.videoUrl });
            setIsSourceReady(true);

            // Background warmup for next access (non-blocking)
            VideoCacheService.warmupCache(video.videoUrl);
        };

        initVideoSource();
        return () => { isCancelled = true; };
    }, [video.id, video.videoUrl, shouldLoad]);

    return { videoSource, isSourceReady, fallbackToNetwork };
}
