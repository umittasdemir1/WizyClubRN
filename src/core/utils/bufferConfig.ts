import { NetInfoStateType } from '@react-native-community/netinfo';

interface BufferConfig {
    minBufferMs: number;
    maxBufferMs: number;
    bufferForPlaybackMs: number;
    bufferForPlaybackAfterRebufferMs: number;
}

export const getBufferConfig = (type: NetInfoStateType | null): BufferConfig => {
    switch (type) {
        case NetInfoStateType.wifi:
        case NetInfoStateType.ethernet:
            // High speed: Aggressive buffering for quality and less rebuffering
            return {
                minBufferMs: 2500,
                maxBufferMs: 60000,
                bufferForPlaybackMs: 500, // Wait a bit more to ensure smooth start? Actually reduced for fast start.
                bufferForPlaybackAfterRebufferMs: 1000,
            };
        case NetInfoStateType.cellular:
            // Cellular: Conservative to save data, but keep enough for stability
            return {
                minBufferMs: 2000,
                maxBufferMs: 10000,
                bufferForPlaybackMs: 250,
                bufferForPlaybackAfterRebufferMs: 500,
            };
        case NetInfoStateType.none:
        case NetInfoStateType.unknown:
        default:
            // Fallback
            return {
                minBufferMs: 2000,
                maxBufferMs: 10000, // conservative default
                bufferForPlaybackMs: 250,
                bufferForPlaybackAfterRebufferMs: 500,
            };
    }
};
