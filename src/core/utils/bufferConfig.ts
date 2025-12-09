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
            // High speed: Moderate buffering for faster start
            return {
                minBufferMs: 2000,
                maxBufferMs: 60000,
                bufferForPlaybackMs: 500,
                bufferForPlaybackAfterRebufferMs: 1000,
            };
        case NetInfoStateType.cellular:
            // Cellular: Balance speed and data
            return {
                minBufferMs: 1500,
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
