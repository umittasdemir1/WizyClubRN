import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { supabase } from '../../core/supabase';

type StoryRow = Record<string, unknown>;

export interface StoryRealtimeEvent {
    eventType: 'INSERT' | 'UPDATE' | 'DELETE';
    new: StoryRow | null;
    old: StoryRow | null;
}

type StoryListener = (event: StoryRealtimeEvent) => void;

export class StoryRealtimeService {
    private static channel: RealtimeChannel | null = null;
    private static listeners = new Map<number, StoryListener>();
    private static nextId = 1;

    subscribe(onStoriesChanged: StoryListener): () => void {
        const listenerId = StoryRealtimeService.nextId++;
        StoryRealtimeService.listeners.set(listenerId, onStoriesChanged);
        this.ensureChannel();

        return () => {
            StoryRealtimeService.listeners.delete(listenerId);
            if (StoryRealtimeService.listeners.size === 0 && StoryRealtimeService.channel) {
                void supabase.removeChannel(StoryRealtimeService.channel);
                StoryRealtimeService.channel = null;
            }
        };
    }

    private ensureChannel(): void {
        if (StoryRealtimeService.channel) {
            return;
        }

        StoryRealtimeService.channel = supabase
            .channel('stories-realtime-shared')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'stories' },
                (payload: RealtimePostgresChangesPayload<StoryRow>) => {
                    const event: StoryRealtimeEvent = {
                        eventType: payload.eventType,
                        new: payload.new ?? null,
                        old: payload.old ?? null,
                    };

                    for (const listener of StoryRealtimeService.listeners.values()) {
                        listener(event);
                    }
                }
            )
            .subscribe();
    }
}
