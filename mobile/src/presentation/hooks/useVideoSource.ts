import { useCallback, useEffect, useState } from 'react';
import { Video as VideoEntity } from '../../domain/entities/Video';
import { VideoCacheService } from '../../data/services/VideoCacheService';

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
        // ✅ SYNCHRONOUS VIDEO SOURCE INITIALIZATION (Zero-latency)
        const initVideoSource = () => {
            if (!shouldLoad) {
                setVideoSource(null);
                setIsSourceReady(false);
                return;
            }

            if (typeof video.videoUrl !== 'string') {
                setVideoSource(video.videoUrl);
                setIsSourceReady(true);
                return;
            }

            // Memory cache check (synchronous, no blocking)
            const memoryCached = VideoCacheService.getMemoryCachedPath(video.videoUrl);
            if (memoryCached) {
                console.log(`[VideoTransition] 🚀 Memory cache HIT: ${video.id}`);
                setVideoSource({ uri: memoryCached });
                setIsSourceReady(true);
                return;
            }

            // ✅ Immediate network fallback (NO BLOCKING)
            console.log(`[VideoTransition] 🌐 Network source: ${video.id}`);
            setVideoSource({ uri: video.videoUrl });
            setIsSourceReady(true);

            // ✅ Background warmup for next access (non-blocking)
            VideoCacheService.warmupCache(video.videoUrl);
        };

        initVideoSource();
    }, [video.id, video.videoUrl, shouldLoad]);

    return { videoSource, isSourceReady, fallbackToNetwork };
}
