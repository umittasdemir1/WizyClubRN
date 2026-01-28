/**
 * VideoErrorHandler - Video Playback Error & Retry Logic
 *
 * This utility centralizes the logic for handling video errors, managing retry counts,
 * and performing network fallbacks when cache files fail.
 */

import { LogCode, logError, logCache } from '@/core/services/Logger';
import { VideoCacheService } from '../../../../data/services/VideoCacheService';
import { getVideoUrl, isValidSource } from '../../../../core/utils/videoUrl';
import { Video as VideoEntity } from '../../../../domain/entities/Video';
import { PlayerSlot } from './SlotRecycler';

export enum ErrorAction {
    RETRY = 'RETRY',
    FALLBACK = 'FALLBACK',
    ABORT = 'ABORT',
}

export interface ErrorResult {
    action: ErrorAction;
    updatedSlotProps?: Partial<PlayerSlot>;
    errorToReport?: any;
}

export class VideoErrorHandler {
    /**
     * Handles a video playback error and determines the next course of action.
     *
     * @param slot - The player slot where the error occurred
     * @param video - The video entity associated with the slot
     * @param maxRetries - Maximum number of allowed retries
     * @param error - The error object from the video player
     * @returns The determined action and any updated slot properties
     */
    static async handleError(
        slot: PlayerSlot,
        video: VideoEntity | undefined,
        maxRetries: number,
        error: any
    ): Promise<ErrorResult> {
        // 1. Log critical error
        logError(LogCode.VIDEO_PLAYBACK_ERROR, 'Video player error', {
            videoId: slot.videoId,
            retryCount: slot.retryCount,
            maxRetries,
            error
        });

        // 2. Check retry limit
        if (slot.retryCount >= maxRetries) {
            return { action: ErrorAction.ABORT };
        }

        // 3. Handle cache failure (fallback to network)
        if (slot.source.startsWith('file://') && video) {
            const videoUrl = getVideoUrl(video);
            logCache(LogCode.CACHE_ERROR, 'Cache failed, falling back to network', {
                videoId: video.id,
                source: slot.source
            });

            if (videoUrl) {
                // Background delete of problematic cache
                VideoCacheService.deleteCachedVideo(videoUrl).catch(() => { });
            }

            return {
                action: ErrorAction.FALLBACK,
                updatedSlotProps: {
                    source: videoUrl && isValidSource(videoUrl) ? videoUrl : '',
                    retryCount: slot.retryCount + 1,
                    hasError: false,
                }
            };
        }

        // 4. Default action: Auto-retry by incrementing nonce
        return {
            action: ErrorAction.RETRY,
            updatedSlotProps: {
                hasError: false,
                isReadyForDisplay: false,
                retryCount: slot.retryCount + 1,
                retryNonce: slot.retryNonce + 1,
            }
        };
    }
}
