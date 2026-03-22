-- Scope service-role maintenance policies to service_role only.
-- This removes unnecessary policy checks for anon/authenticated users.

alter policy "notification_queue_service_role_all" on public.notification_queue
    to service_role;

alter policy "notifications_insert_service_role" on public.notifications
    to service_role;

alter policy "Service role can manage places" on public.places
    to service_role;
