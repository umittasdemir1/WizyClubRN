-- Add expo_push_token column to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS expo_push_token TEXT;

-- Create an RPC to update the expo_push_token easily from the mobile app
CREATE OR REPLACE FUNCTION update_expo_push_token(p_user_id UUID, p_token TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.profiles
  SET expo_push_token = p_token,
      updated_at = NOW()
  WHERE id = p_user_id;
END;
$$;
