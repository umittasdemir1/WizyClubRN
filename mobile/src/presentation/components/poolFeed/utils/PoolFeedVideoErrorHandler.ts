/**
 * PoolFeedVideoErrorHandler - Video Playback Error & Retry Logic
 *
 * This utility centralizes the logic for handling video errors, managing retry counts,
 * and performing network fallbacks when cache files fail.
 */

import { LogCode, logError, logCache } from '@/core/services/Logger';
import { VideoCacheService } from '../../../../data/services/VideoCacheService';
import { getVideoUrl, isValidSource } from '../../../../core/utils/videoUrl';
import { Video as VideoEntity } from '../../../../domain/entities/Video';
import { PlayerSlot } from './PoolFeedSlotRecycler';

export enum ErrorAction {
    RETRY = 'RETRY',
    FALLBACK = 'FALLBACK',
    ABORT = 'ABORT',
}

export interface ErrorResult {
    action: ErrorAction;
    updatedSlotProps?: Partial<PlayerSlot>;
    errorToReport?: any;
    retryDelayMs?: number;
}

export class PoolFeedVideoErrorHandler {
    private static getErrorDetails(error: any): string {
        const parts: string[] = [];
        const stack = error?.error?.errorStackTrace ?? error?.errorStackTrace;
        const exception = error?.error?.errorException ?? error?.errorException;
        const errorCode = error?.error?.errorCode ?? error?.errorCode;
        const errorString = error?.error?.errorString ?? error?.errorString;

        if (errorCode) parts.push(String(errorCode));
        if (errorString) parts.push(String(errorString));
        if (exception) parts.push(String(exception));
        if (stack) parts.push(String(stack));

        if (parts.length > 0) return parts.join(' | ').toLowerCase();

        try {
            return JSON.stringify(error ?? {}).toLowerCase();
        } catch {
            return String(error ?? '').toLowerCase();
        }
    }

    private static isDecoderFailure(error: any): boolean {
        const details = PoolFeedVideoErrorHandler.getErrorDetails(error);

        return (
            details.includes('24003') ||
            details.includes('error_code_decoding_failed') ||
            details.includes('mediacodecvideorenderer error') ||
            details.includes('mediacodecvideodecoderexception') ||
            details.includes('decoder failed') ||
            details.includes('omx.') ||
            details.includes('codecexception') ||
            details.includes('0x80001000') ||
            details.includes('0x80001001')
        );
    }

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
        const isDecoderFailure = PoolFeedVideoErrorHandler.isDecoderFailure(error);

        // 1. Handle cache failure first (fallback to network). This is recoverable.
        if (slot.source.startsWith('file://') && video) {
            const videoUrl = getVideoUrl(video);
            logCache(LogCode.CACHE_ERROR, 'Cache failed, falling back to network', {
                videoId: video.id,
                source: slot.source,
                retryCount: slot.retryCount,
                decoderFailure: isDecoderFailure,
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
                    isLoaded: false,
                    isReadyForDisplay: false,
                    retryNonce: slot.retryNonce + 1,
                }
            };
        }

        // 2. Check retry limit for non-cache failures
        if (slot.retryCount >= maxRetries) {
            logError(LogCode.VIDEO_PLAYBACK_ERROR, 'Video player error (max retries reached)', {
                videoId: slot.videoId,
                retryCount: slot.retryCount,
                maxRetries,
                error
            });
            return { action: ErrorAction.ABORT };
        }

        // 3. Decoder failures typically need a slightly longer cooldown.
        if (isDecoderFailure) {
            logError(LogCode.VIDEO_PLAYBACK_ERROR, 'Video decoder failure, retrying', {
                videoId: slot.videoId,
                source: slot.source,
                retryCount: slot.retryCount,
                maxRetries,
                error
            });
            return {
                action: ErrorAction.RETRY,
                retryDelayMs: 900 + (slot.retryCount * 350),
                updatedSlotProps: {
                    hasError: false,
                    isLoaded: false,
                    isReadyForDisplay: false,
                    retryCount: slot.retryCount + 1,
                    retryNonce: slot.retryNonce + 1,
                }
            };
        }

        // 4. Default action: Auto-retry by incrementing nonce
        logError(LogCode.VIDEO_PLAYBACK_ERROR, 'Video player error, retrying', {
            videoId: slot.videoId,
            source: slot.source,
            retryCount: slot.retryCount,
            maxRetries,
            error
        });
        return {
            action: ErrorAction.RETRY,
            updatedSlotProps: {
                hasError: false,
                isLoaded: false,
                isReadyForDisplay: false,
                retryCount: slot.retryCount + 1,
                retryNonce: slot.retryNonce + 1,
            }
        };
    }
}
