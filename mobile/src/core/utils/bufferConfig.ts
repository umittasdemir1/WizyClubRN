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
                minBufferMs: 2000,
                maxBufferMs: 30000,
                bufferForPlaybackMs: 250,
                bufferForPlaybackAfterRebufferMs: 500,
            };
        case NetInfoStateType.cellular:
            return {
                minBufferMs: 2000,
                maxBufferMs: 15000,
                bufferForPlaybackMs: 250,
                bufferForPlaybackAfterRebufferMs: 500,
            };
        case NetInfoStateType.none:
        case NetInfoStateType.unknown:
        default:
            return {
                minBufferMs: 2000,
                maxBufferMs: 10000,
                bufferForPlaybackMs: 250,
                bufferForPlaybackAfterRebufferMs: 500,
            };
    }
};
