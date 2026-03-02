import { LogCode, Logger } from '@/core/services/Logger';

type UploadFlowEventName =
    | 'payload_used'
    | 'poll_resolved'
    | 'poll_missed'
    | 'refresh_skipped'
    | 'refresh_triggered';

type UploadFlowLevel = 'info' | 'warn';

interface UploadFlowTelemetryEvent {
    name: UploadFlowEventName;
    code: LogCode;
    message: string;
    level?: UploadFlowLevel;
    videoId?: string;
    details?: Record<string, unknown>;
}

export class UploadFlowTelemetryService {
    private static readonly SAMPLE_LOG_INTERVAL = 10;
    private static readonly SUMMARY_LOG_INTERVAL = 5;
    private static counts = new Map<string, number>();
    private static totals: Record<UploadFlowEventName, number> = {
        payload_used: 0,
        poll_resolved: 0,
        poll_missed: 0,
        refresh_skipped: 0,
        refresh_triggered: 0,
    };
    private static totalEvents = 0;

    static record(event: UploadFlowTelemetryEvent): void {
        const key = [event.name, event.videoId ?? 'unknown'].join(':');
        const sampleCount = (this.counts.get(key) ?? 0) + 1;
        this.counts.set(key, sampleCount);
        this.totals[event.name] += 1;
        this.totalEvents += 1;

        if (this.shouldLog(sampleCount)) {
            const payload = {
                videoId: event.videoId ?? null,
                sampleCount,
                ...event.details,
            };

            if (event.level === 'warn') {
                Logger.warn(event.code, event.message, payload, 'Telemetry');
            } else {
                Logger.info(event.code, event.message, payload, 'Telemetry');
            }
        }

        if (!this.shouldLogSummary()) {
            return;
        }

        Logger.info(
            LogCode.VIDEO_UPLOAD_FLOW_SUMMARY,
            'Upload flow telemetry summary',
            {
                totalEvents: this.totalEvents,
                ...this.totals,
            },
            'Telemetry'
        );
    }

    private static shouldLog(sampleCount: number): boolean {
        return sampleCount <= 3 || sampleCount % UploadFlowTelemetryService.SAMPLE_LOG_INTERVAL === 0;
    }

    private static shouldLogSummary(): boolean {
        return this.totalEvents % UploadFlowTelemetryService.SUMMARY_LOG_INTERVAL === 0;
    }
}
