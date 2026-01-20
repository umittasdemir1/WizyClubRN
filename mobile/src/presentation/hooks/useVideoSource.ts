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
        let isCancelled = false;
        const startTime = Date.now();

        const initVideoSource = async () => {
            if (!shouldLoad) {
                if (!isCancelled) {
                    setVideoSource(null);
                    setIsSourceReady(false);
                }
                return;
            }

            if (typeof video.videoUrl !== 'string') {
                setVideoSource(video.videoUrl);
                setIsSourceReady(true);
                return;
            }

            console.log(`[VideoTransition] 🔍 Source init START for ${video.id} at ${Date.now()}`);

            const memoryCached = VideoCacheService.getMemoryCachedPath(video.videoUrl);
            if (memoryCached && !isCancelled) {
                console.log(`[VideoTransition] 🚀 Memory cache HIT: ${video.id} in ${Date.now() - startTime}ms`);
                setVideoSource({ uri: memoryCached });
                setIsSourceReady(true);
                return;
            }

            const diskCached = await VideoCacheService.getCachedVideoPath(video.videoUrl);
            if (diskCached && !isCancelled) {
                console.log(`[VideoTransition] ⚡ Disk cache HIT: ${video.id} in ${Date.now() - startTime}ms`);
                setVideoSource({ uri: diskCached });
                setIsSourceReady(true);
                return;
            }

            if (!isCancelled) {
                console.log(`[VideoTransition] 🌐 Network MISS: ${video.id} in ${Date.now() - startTime}ms`);
                setVideoSource({ uri: video.videoUrl });
                setIsSourceReady(true);
            }
        };

        setIsSourceReady(false);
        initVideoSource();

        return () => {
            isCancelled = true;
        };
    }, [video.id, video.videoUrl, shouldLoad]);

    return { videoSource, isSourceReady, fallbackToNetwork };
}
