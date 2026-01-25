import AsyncStorage from '@react-native-async-storage/async-storage';
import { Logger, LogCode, logPerf, logError, logSystem } from './Logger';

interface TransitionMetric {
    videoId: string;
    startTime: number;
    endTime?: number;
    duration?: number;
    source?: 'memory-cache' | 'disk-cache' | 'network';
    error?: string;
}

const STORAGE_KEY = '@performance_metrics';
const MAX_METRICS = 100; // Keep last 100 transitions

class PerformanceLoggerService {
    private metrics = new Map<string, TransitionMetric>();
    private completedMetrics: TransitionMetric[] = [];

    /**
     * Start tracking a video transition
     */
    startTransition(videoId: string) {
        const metric: TransitionMetric = {
            videoId,
            startTime: Date.now(),
        };
        this.metrics.set(videoId, metric);
        // Removed console.log to reduce terminal spam
    }

    /**
     * End tracking a video transition
     */
    endTransition(videoId: string, source: 'memory-cache' | 'disk-cache' | 'network') {
        let metric = this.metrics.get(videoId);
        let isPreRendered = false;

        // Auto-create start metric if not found (for pre-rendered videos)
        if (!metric) {
            // Silently create metric for pre-rendered videos
            this.startTransition(videoId);
            metric = this.metrics.get(videoId);
            if (!metric) return; // Safety check
            isPreRendered = true;
        }

        const endTime = Date.now();
        const duration = endTime - metric.startTime;

        // Ignore pre-rendered videos with unrealistic timing (<100ms)
        if (isPreRendered && duration < 100) {
            // Silently ignore pre-rendered videos
            this.metrics.delete(videoId);
            return;
        }

        metric.endTime = endTime;
        metric.duration = duration;
        metric.source = source;

        this.completedMetrics.push(metric);
        this.metrics.delete(videoId);

        // Only log slow transitions (>1000ms) to reduce spam
        if (duration > 1000) {
            logPerf(LogCode.PERF_SLOW_RENDER, 'Slow video transition detected', {
                videoId,
                duration,
                source,
            });
        }

        // Save to AsyncStorage periodically
        if (this.completedMetrics.length % 10 === 0) {
            this.saveMetrics();
        }
    }

    /**
     * Mark a transition as failed
     */
    failTransition(videoId: string, error: string) {
        const metric = this.metrics.get(videoId);
        if (metric) {
            metric.error = error;
            metric.endTime = Date.now();
            metric.duration = metric.endTime - metric.startTime;
            this.completedMetrics.push(metric);
            this.metrics.delete(videoId);
            logError(LogCode.VIDEO_LOAD_ERROR, 'Video transition failed', { videoId, error });
        }
    }

    /**
     * Get performance emoji based on duration and source
     */
    private getPerformanceEmoji(duration: number, source: string): string {
        if (source === 'memory-cache') {
            return duration < 100 ? '🚀' : duration < 200 ? '⚡' : '✅';
        }
        if (source === 'disk-cache') {
            return duration < 200 ? '⚡' : duration < 400 ? '✅' : '⚠️';
        }
        // network
        return duration < 500 ? '✅' : duration < 1000 ? '⚠️' : '🐢';
    }

    /**
     * Get statistics from collected metrics
     */
    getStats() {
        if (this.completedMetrics.length === 0) {
            return null;
        }

        const durations = this.completedMetrics
            .filter(m => m.duration !== undefined)
            .map(m => m.duration!);

        const cacheHits = this.completedMetrics.filter(
            m => m.source === 'memory-cache' || m.source === 'disk-cache'
        ).length;

        const total = this.completedMetrics.length;
        const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
        const sorted = [...durations].sort((a, b) => a - b);
        const p50 = sorted[Math.floor(sorted.length * 0.5)];
        const p95 = sorted[Math.floor(sorted.length * 0.95)];
        const p99 = sorted[Math.floor(sorted.length * 0.99)];

        return {
            total,
            cacheHitRate: ((cacheHits / total) * 100).toFixed(1) + '%',
            avg: Math.round(avg),
            p50,
            p95,
            p99,
            min: Math.min(...durations),
            max: Math.max(...durations),
        };
    }

    /**
     * Print statistics to console
     */
    printStats() {
        const stats = this.getStats();
        if (!stats) {
            logPerf(LogCode.PERF_MEASURE_END, 'No performance metrics collected yet');
            return;
        }

        logPerf(LogCode.PERF_MEASURE_END, 'Performance statistics', stats);
    }

    /**
     * Save metrics to AsyncStorage
     */
    private async saveMetrics() {
        try {
            const metricsToSave = this.completedMetrics.slice(-MAX_METRICS);
            await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(metricsToSave));
        } catch (error) {
            logError(LogCode.ASYNC_STORAGE_ERROR, 'Failed to save performance metrics', error);
        }
    }

    /**
     * Load metrics from AsyncStorage
     */
    async loadMetrics() {
        try {
            const saved = await AsyncStorage.getItem(STORAGE_KEY);
            if (saved) {
                this.completedMetrics = JSON.parse(saved);
                logPerf(LogCode.ASYNC_STORAGE_GET, 'Performance metrics loaded', {
                    count: this.completedMetrics.length,
                });
            }
        } catch (error) {
            logError(LogCode.ASYNC_STORAGE_ERROR, 'Failed to load performance metrics', error);
        }
    }

    /**
     * Clear all metrics
     */
    async clearMetrics() {
        this.metrics.clear();
        this.completedMetrics = [];
        await AsyncStorage.removeItem(STORAGE_KEY);
        logSystem(LogCode.STORE_UPDATE, 'All performance metrics cleared');
    }

    /**
     * Export metrics as CSV string
     */
    exportCSV(): string {
        const headers = 'videoId,startTime,endTime,duration,source,error\n';
        const rows = this.completedMetrics
            .map(m =>
                `${m.videoId},${m.startTime},${m.endTime || ''},${m.duration || ''},${m.source || ''},${m.error || ''}`
            )
            .join('\n');
        return headers + rows;
    }
}

export const PerformanceLogger = new PerformanceLoggerService();
