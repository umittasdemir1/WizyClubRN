import { NetInfoStateType } from '@react-native-community/netinfo';

interface BufferConfig {
    minBufferMs: number;
    maxBufferMs: number;
    bufferForPlaybackMs: number;
    bufferForPlaybackAfterRebufferMs: number;
}

// TikTok-style aggressive buffering for instant start
export const getBufferConfig = (type: NetInfoStateType | null): BufferConfig => {
    switch (type) {
        case NetInfoStateType.wifi:
        case NetInfoStateType.ethernet:
            return {
                // 🔥 WiFi: Ultra aggressive for instant start
                minBufferMs: 500,
                maxBufferMs: 30000,
                bufferForPlaybackMs: 50,  // TikTok-style: start ASAP
                bufferForPlaybackAfterRebufferMs: 250,
            };
        case NetInfoStateType.cellular:
            return {
                // Cellular: Slightly conservative but still fast
                minBufferMs: 750,
                maxBufferMs: 15000,
                bufferForPlaybackMs: 100,
                bufferForPlaybackAfterRebufferMs: 300,
            };
        case NetInfoStateType.none:
        case NetInfoStateType.unknown:
        default:
            return {
                // Unknown: Balance speed and stability
                minBufferMs: 1000,
                maxBufferMs: 10000,
                bufferForPlaybackMs: 100,
                bufferForPlaybackAfterRebufferMs: 500,
            };
    }
};
