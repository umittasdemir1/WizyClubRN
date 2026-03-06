-- Reduce per-row RLS function re-evaluation by wrapping auth calls in SELECT.
-- Also remove redundant SELECT policy because ALL policy already covers it.

alter policy "notification_queue_service_role_all" on public.notification_queue
    using ((select auth.role()) = 'service_role'::text)
    with check ((select auth.role()) = 'service_role'::text);

alter policy "notifications_select_own" on public.notifications
    using ((select auth.uid()) = user_id);

alter policy "notifications_update_own" on public.notifications
    using ((select auth.uid()) = user_id)
    with check ((select auth.uid()) = user_id);

alter policy "notifications_insert_service_role" on public.notifications
    with check ((select auth.role()) = 'service_role'::text);

alter policy "Users can manage own recent places" on public.user_recent_places
    using ((select auth.uid()) = user_id)
    with check ((select auth.uid()) = user_id);

drop policy if exists "Users can read own recent places" on public.user_recent_places;
