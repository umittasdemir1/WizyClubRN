-- Notification system hardening v1
-- - Queue resiliency columns (retry/lock/priority/idempotency)
-- - Delivery traceability from queue -> notifications
-- - RLS policy tightening
-- - Targeted indexes for scheduler polling and user inbox reads

BEGIN;

-- ---------------------------------------------------------------------------
-- Queue: operational fields for retries, locking, and observability
-- ---------------------------------------------------------------------------
ALTER TABLE public.notification_queue
    ADD COLUMN IF NOT EXISTS attempt_count integer NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS max_attempts integer NOT NULL DEFAULT 3,
    ADD COLUMN IF NOT EXISTS next_retry_at timestamptz,
    ADD COLUMN IF NOT EXISTS locked_at timestamptz,
    ADD COLUMN IF NOT EXISTS locked_by text,
    ADD COLUMN IF NOT EXISTS priority smallint NOT NULL DEFAULT 100,
    ADD COLUMN IF NOT EXISTS idempotency_key text,
    ADD COLUMN IF NOT EXISTS delivery_summary jsonb NOT NULL DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS last_error_at timestamptz;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'notification_queue_attempt_count_check'
    ) THEN
        ALTER TABLE public.notification_queue
            ADD CONSTRAINT notification_queue_attempt_count_check
            CHECK (attempt_count >= 0);
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'notification_queue_max_attempts_check'
    ) THEN
        ALTER TABLE public.notification_queue
            ADD CONSTRAINT notification_queue_max_attempts_check
            CHECK (max_attempts >= 1);
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'notification_queue_priority_check'
    ) THEN
        ALTER TABLE public.notification_queue
            ADD CONSTRAINT notification_queue_priority_check
            CHECK (priority BETWEEN 1 AND 1000);
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'notification_queue_user_id_fkey'
    ) THEN
        ALTER TABLE public.notification_queue
            DROP CONSTRAINT notification_queue_user_id_fkey;
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'notification_queue_user_id_fkey_profiles'
    ) THEN
        ALTER TABLE public.notification_queue
            ADD CONSTRAINT notification_queue_user_id_fkey_profiles
            FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
    END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Notifications: delivery metadata + queue traceability
-- ---------------------------------------------------------------------------
ALTER TABLE public.notifications
    ADD COLUMN IF NOT EXISTS source_queue_id uuid,
    ADD COLUMN IF NOT EXISTS delivered_at timestamptz,
    ADD COLUMN IF NOT EXISTS read_at timestamptz,
    ADD COLUMN IF NOT EXISTS channel text NOT NULL DEFAULT 'in_app',
    ADD COLUMN IF NOT EXISTS deeplink text,
    ADD COLUMN IF NOT EXISTS image_url text,
    ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'notifications_source_queue_id_fkey'
    ) THEN
        ALTER TABLE public.notifications
            ADD CONSTRAINT notifications_source_queue_id_fkey
            FOREIGN KEY (source_queue_id) REFERENCES public.notification_queue(id) ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'notifications_channel_check'
    ) THEN
        ALTER TABLE public.notifications
            ADD CONSTRAINT notifications_channel_check
            CHECK (channel IN ('in_app', 'push', 'in_app_push'));
    END IF;
END $$;

CREATE OR REPLACE FUNCTION public.sync_notification_read_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    IF NEW.is_read IS TRUE
       AND (OLD.is_read IS DISTINCT FROM TRUE)
       AND NEW.read_at IS NULL THEN
        NEW.read_at := now();
    ELSIF NEW.is_read IS FALSE THEN
        NEW.read_at := NULL;
    END IF;

    RETURN NEW;
END;
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_trigger
        WHERE tgname = 'trg_notifications_sync_read_at'
    ) THEN
        CREATE TRIGGER trg_notifications_sync_read_at
        BEFORE UPDATE OF is_read ON public.notifications
        FOR EACH ROW
        EXECUTE FUNCTION public.sync_notification_read_at();
    END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------
DROP INDEX IF EXISTS public.idx_notifications_user;
DROP INDEX IF EXISTS public.idx_notifications_user_id;

CREATE INDEX IF NOT EXISTS idx_notifications_user_created_at
    ON public.notifications (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread_created_at
    ON public.notifications (user_id, is_read, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_source_queue
    ON public.notifications (source_queue_id);

CREATE UNIQUE INDEX IF NOT EXISTS uq_notifications_user_queue
    ON public.notifications (user_id, source_queue_id);

DROP INDEX IF EXISTS public.idx_notification_queue_polling;

CREATE INDEX IF NOT EXISTS idx_notification_queue_dispatch
    ON public.notification_queue (status, priority, scheduled_at, created_at);

CREATE INDEX IF NOT EXISTS idx_notification_queue_retry_due
    ON public.notification_queue (status, next_retry_at, scheduled_at);

CREATE INDEX IF NOT EXISTS idx_notification_queue_processing_locks
    ON public.notification_queue (status, locked_at);

CREATE UNIQUE INDEX IF NOT EXISTS uq_notification_queue_idempotency_key
    ON public.notification_queue (idempotency_key)
    WHERE idempotency_key IS NOT NULL;

-- ---------------------------------------------------------------------------
-- RLS hardening
-- ---------------------------------------------------------------------------
ALTER TABLE public.notification_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "System can manage notification queue" ON public.notification_queue;

DROP POLICY IF EXISTS "Authenticated users can receive notifications" ON public.notifications;
DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;

CREATE POLICY notification_queue_service_role_all
    ON public.notification_queue
    FOR ALL
    TO public
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

CREATE POLICY notifications_select_own
    ON public.notifications
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY notifications_update_own
    ON public.notifications
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY notifications_insert_service_role
    ON public.notifications
    FOR INSERT
    TO public
    WITH CHECK (auth.role() = 'service_role');

COMMIT;
