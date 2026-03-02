import { LogCode, Logger } from '@/core/services/Logger';

type RpcFallbackReason = 'rpc_missing' | 'rpc_error' | 'unsupported_input';

interface RpcFallbackTelemetryEvent {
    rpcName: string;
    fallbackPath: string;
    reason: RpcFallbackReason;
    errorCode?: string | null;
    userIdPresent?: boolean;
    details?: Record<string, unknown>;
}

export class RpcFallbackTelemetryService {
    private static readonly SAMPLE_LOG_INTERVAL = 10;
    private static counts = new Map<string, number>();

    static record(event: RpcFallbackTelemetryEvent): void {
        const key = [
            event.rpcName,
            event.fallbackPath,
            event.reason,
            event.errorCode ?? 'none',
        ].join(':');

        const sampleCount = (this.counts.get(key) ?? 0) + 1;
        this.counts.set(key, sampleCount);

        if (!this.shouldLog(sampleCount)) {
            return;
        }

        Logger.warn(
            LogCode.DB_RPC_FALLBACK,
            'RPC fallback used',
            {
                rpcName: event.rpcName,
                fallbackPath: event.fallbackPath,
                reason: event.reason,
                errorCode: event.errorCode ?? null,
                userIdPresent: !!event.userIdPresent,
                sampleCount,
                ...event.details,
            },
            'Telemetry'
        );
    }

    private static shouldLog(sampleCount: number): boolean {
        return sampleCount <= 3 || sampleCount % RpcFallbackTelemetryService.SAMPLE_LOG_INTERVAL === 0;
    }
}
