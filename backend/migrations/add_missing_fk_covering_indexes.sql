-- Add covering indexes for frequently joined foreign keys.
-- Mirrors Supabase advisor recommendations for performance.
create index if not exists idx_notification_queue_user_id
    on public.notification_queue (user_id);

create index if not exists idx_user_recent_places_place_id
    on public.user_recent_places (place_id);
