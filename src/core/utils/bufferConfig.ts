import { NetInfoStateType } from '@react-native-community/netinfo';

interface BufferConfig {
    minBufferMs: number;
    maxBufferMs: number;
    bufferForPlaybackMs: number;
    bufferForPlaybackAfterRebufferMs: number;
}

// Optimized for faster playback start
export const getBufferConfig = (type: NetInfoStateType | null): BufferConfig => {
    switch (type) {
        case NetInfoStateType.wifi:
        case NetInfoStateType.ethernet:
            return {
                minBufferMs: 100, // Instant start (TikTok style)
                maxBufferMs: 50000,
                bufferForPlaybackMs: 100, // Minimal buffer before resume
                bufferForPlaybackAfterRebufferMs: 500,
            };
        case NetInfoStateType.cellular:
            return {
                minBufferMs: 100,
                maxBufferMs: 10000,
                bufferForPlaybackMs: 100,
                bufferForPlaybackAfterRebufferMs: 500,
            };
        case NetInfoStateType.none:
        case NetInfoStateType.unknown:
        default:
            return {
                minBufferMs: 100,
                maxBufferMs: 10000,
                bufferForPlaybackMs: 100,
                bufferForPlaybackAfterRebufferMs: 500,
            };
    }
};
