-- Create Drafts Table
create table if not exists public.drafts (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  media_uri text not null,
  media_type text not null, -- 'video' or 'image'
  thumbnail_uri text,
  description text,
  commercial_type text,
  brand_name text,
  brand_url text,
  tags jsonb default '[]'::jsonb,
  use_ai_label boolean default false,
  upload_mode text default 'video',
  created_at timestamptz default now() not null,
  expires_at timestamptz default (now() + interval '24 hours')
);

-- Enable RLS
alter table public.drafts enable row level security;

-- Create Policy (Users can see only their own drafts)
create policy "Users can view own drafts"
  on public.drafts for select
  using (auth.uid() = user_id);

create policy "Users can insert own drafts"
  on public.drafts for insert
  with check (auth.uid() = user_id);

create policy "Users can update own drafts"
  on public.drafts for update
  using (auth.uid() = user_id);

create policy "Users can delete own drafts"
  on public.drafts for delete
  using (auth.uid() = user_id);

-- Create Policy for Service Role (Backend Cleanup)
-- Note: Service role bypasses RLS, but if you query via anon/authenticated key from server without service role, you need this.
-- Usually backend uses service_role key.
