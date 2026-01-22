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
    if (isLocalFile) {
        return {
            minBufferMs: 100,
            maxBufferMs: 1000,
            bufferForPlaybackMs: 0,  // INSTANT start
            bufferForPlaybackAfterRebufferMs: 50,
        };
    }

    // 📡 NETWORK FILES: Aggressive streaming
    switch (type) {
        case NetInfoStateType.wifi:
        case NetInfoStateType.ethernet:
            return {
                minBufferMs: 500,    // ✅ Optimized for instant start
                maxBufferMs: 30000,
                bufferForPlaybackMs: 150,
                bufferForPlaybackAfterRebufferMs: 300,
            };
        case NetInfoStateType.cellular:
            return {
                minBufferMs: 500,
                maxBufferMs: 15000,
                bufferForPlaybackMs: 200,
                bufferForPlaybackAfterRebufferMs: 400,
            };
        case NetInfoStateType.none:
        case NetInfoStateType.unknown:
        default:
            return {
                minBufferMs: 500,
                maxBufferMs: 10000,
                bufferForPlaybackMs: 200,
                bufferForPlaybackAfterRebufferMs: 400,
            };
    }
};
