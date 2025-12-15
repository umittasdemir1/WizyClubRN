import { NetInfoStateType } from '@react-native-community/netinfo';

interface BufferConfig {
    minBufferMs: number;
    maxBufferMs: number;
    bufferForPlaybackMs: number;
    bufferForPlaybackAfterRebufferMs: number;
}

// Optimized for faster playback start
// IMPORTANT: minBufferMs must be >= bufferForPlaybackAfterRebufferMs (ExoPlayer requirement)
export const getBufferConfig = (type: NetInfoStateType | null): BufferConfig => {
    switch (type) {
        case NetInfoStateType.wifi:
        case NetInfoStateType.ethernet:
            return {
                minBufferMs: 500, // Must be >= bufferForPlaybackAfterRebufferMs
                maxBufferMs: 50000,
                bufferForPlaybackMs: 250, // Minimal buffer before initial playback
                bufferForPlaybackAfterRebufferMs: 500, // Buffer after rebuffer
            };
        case NetInfoStateType.cellular:
            return {
                minBufferMs: 1000, // Higher for cellular to prevent buffering
                maxBufferMs: 10000,
                bufferForPlaybackMs: 500,
                bufferForPlaybackAfterRebufferMs: 1000,
            };
        case NetInfoStateType.none:
        case NetInfoStateType.unknown:
        default:
            return {
                minBufferMs: 1000,
                maxBufferMs: 10000,
                bufferForPlaybackMs: 500,
                bufferForPlaybackAfterRebufferMs: 1000,
            };
    }
};
