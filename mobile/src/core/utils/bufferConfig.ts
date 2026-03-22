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
                minBufferMs: 800,
                maxBufferMs: 30000,
                bufferForPlaybackMs: 200,  // ✅ Reduced from 500ms for instant start
                bufferForPlaybackAfterRebufferMs: 800,
            };
        case NetInfoStateType.cellular:
            return {
                minBufferMs: 1000,
                maxBufferMs: 30000,
                bufferForPlaybackMs: 300,  // ✅ Reduced from 800ms for faster start
                bufferForPlaybackAfterRebufferMs: 1000,
            };
        case NetInfoStateType.none:
        case NetInfoStateType.unknown:
        default:
            return {
                minBufferMs: 1500,
                maxBufferMs: 20000,
                bufferForPlaybackMs: 800,
                bufferForPlaybackAfterRebufferMs: 1500,
            };
    }
};
