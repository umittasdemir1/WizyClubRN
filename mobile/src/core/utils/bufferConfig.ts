import { NetInfoStateType } from '@react-native-community/netinfo';

interface BufferConfig {
    minBufferMs: number;
    maxBufferMs: number;
    bufferForPlaybackMs: number;
    bufferForPlaybackAfterRebufferMs: number;
}

// TikTok-style aggressive buffering for instant start
export const getBufferConfig = (
    type: NetInfoStateType | null,
    isLocalFile: boolean = false
): BufferConfig => {
    // 🚀 LOCAL FILES (Cached): Zero-latency playback
    // Disk read is instant, no buffering needed
    if (isLocalFile) {
        return {
            minBufferMs: 250,        // Start playing immediately
            maxBufferMs: 1500,       // Minimal buffer pool
            bufferForPlaybackMs: 50, // Almost instant start
            bufferForPlaybackAfterRebufferMs: 100,
        };
    }

    // 📡 NETWORK FILES: Aggressive streaming
    switch (type) {
        case NetInfoStateType.wifi:
        case NetInfoStateType.ethernet:
            return {
                minBufferMs: 250,    // Reduced from 2000ms → Instant start on WiFi
                maxBufferMs: 30000,
                bufferForPlaybackMs: 250,
                bufferForPlaybackAfterRebufferMs: 500,
            };
        case NetInfoStateType.cellular:
            return {
                minBufferMs: 500,    // Slightly safer for cellular
                maxBufferMs: 15000,
                bufferForPlaybackMs: 250,
                bufferForPlaybackAfterRebufferMs: 500,
            };
        case NetInfoStateType.none:
        case NetInfoStateType.unknown:
        default:
            return {
                minBufferMs: 1000,   // Conservative for unknown connection
                maxBufferMs: 10000,
                bufferForPlaybackMs: 250,
                bufferForPlaybackAfterRebufferMs: 500,
            };
    }
};
