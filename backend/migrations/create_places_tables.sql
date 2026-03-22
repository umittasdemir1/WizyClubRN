-- ============================================================
-- Location Data Strategy: DB-first, Places-fallback
-- ============================================================
-- This migration creates the canonical places table, user recent
-- places table, PostGIS + pg_trgm extensions, and all supporting
-- RPCs for the DB-first location architecture.
--
-- Run order:
--   1. enable_postgis_and_trgm (executed separately)
--   2. This file
-- ============================================================

-- 1. Canonical Places Table
create table if not exists public.places (
  id uuid primary key default gen_random_uuid(),
  provider text not null default 'google',
  provider_place_id text,
  name text not null,
  formatted_address text,
  location geography(Point, 4326),
  latitude double precision not null,
  longitude double precision not null,
  city text,
  region text,
  country text,
  usage_count integer not null default 0,
  is_active boolean not null default true,
  metadata_json jsonb,
  last_synced_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Unique on Google place ID
create unique index if not exists idx_places_provider_place_id
  on public.places (provider_place_id)
  where provider_place_id is not null;

-- PostGIS spatial index
create index if not exists idx_places_location
  on public.places using gist (location);

-- Trigram index for fuzzy name search
create index if not exists idx_places_name_trgm
  on public.places using gin (name extensions.gin_trgm_ops);

-- Active places
create index if not exists idx_places_active
  on public.places (is_active, usage_count desc);

-- Auto-set geography from lat/lng
create or replace function public.places_set_geography()
returns trigger language plpgsql security definer as $$
begin
  new.location := extensions.st_setsrid(
    extensions.st_makepoint(new.longitude, new.latitude), 4326
  )::geography;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_places_set_geography on public.places;
create trigger trg_places_set_geography
  before insert or update of latitude, longitude on public.places
  for each row execute function public.places_set_geography();

-- 2. User Recent Places
create table if not exists public.user_recent_places (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  place_id uuid not null references public.places(id) on delete cascade,
  kind text not null default 'recent'
    check (kind in ('recent', 'favorite', 'home', 'work')),
  use_count integer not null default 1,
  last_used_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (user_id, place_id, kind)
);

create index if not exists idx_user_recent_places_user
  on public.user_recent_places (user_id, last_used_at desc);

-- 3. RPC: Nearby places (PostGIS)
create or replace function public.get_nearby_places(
  p_latitude double precision,
  p_longitude double precision,
  p_radius_meters double precision default 1500,
  p_limit integer default 8
)
returns table (
  id uuid, provider_place_id text, name text, formatted_address text,
  latitude double precision, longitude double precision,
  usage_count integer, distance_meters double precision
) language sql stable security definer as $$
  select p.id, p.provider_place_id, p.name, p.formatted_address,
         p.latitude, p.longitude, p.usage_count,
         extensions.st_distance(p.location,
           extensions.st_setsrid(extensions.st_makepoint(p_longitude, p_latitude), 4326)::geography
         ) as distance_meters
  from public.places p
  where p.is_active = true
    and extensions.st_dwithin(p.location,
      extensions.st_setsrid(extensions.st_makepoint(p_longitude, p_latitude), 4326)::geography,
      p_radius_meters)
  order by distance_meters asc limit p_limit;
$$;

-- 4. RPC: Search by name (trigram)
create or replace function public.search_places_by_name(
  p_query text, p_limit integer default 6
)
returns table (
  id uuid, provider_place_id text, name text, formatted_address text,
  latitude double precision, longitude double precision,
  usage_count integer, similarity_score real
) language sql stable security definer as $$
  select p.id, p.provider_place_id, p.name, p.formatted_address,
         p.latitude, p.longitude, p.usage_count,
         extensions.similarity(p.name, p_query) as similarity_score
  from public.places p
  where p.is_active = true
    and (p.name ilike '%' || p_query || '%'
         or extensions.similarity(p.name, p_query) > 0.2)
  order by extensions.similarity(p.name, p_query) desc, p.usage_count desc
  limit p_limit;
$$;

-- 5. RPC: User recent places
create or replace function public.get_user_recent_places(
  p_user_id uuid, p_limit integer default 5
)
returns table (
  id uuid, provider_place_id text, name text, formatted_address text,
  latitude double precision, longitude double precision,
  use_count integer, last_used_at timestamptz
) language sql stable security definer as $$
  select p.id, p.provider_place_id, p.name, p.formatted_address,
         p.latitude, p.longitude, urp.use_count, urp.last_used_at
  from public.user_recent_places urp
  join public.places p on p.id = urp.place_id
  where urp.user_id = p_user_id and urp.kind = 'recent' and p.is_active = true
  order by urp.last_used_at desc limit p_limit;
$$;

-- 6. RPC: Upsert place
create or replace function public.upsert_place(
  p_provider text, p_provider_place_id text, p_name text,
  p_formatted_address text, p_latitude double precision,
  p_longitude double precision, p_city text default null,
  p_region text default null, p_country text default null,
  p_metadata_json jsonb default null
) returns uuid language plpgsql security definer as $$
declare v_place_id uuid;
begin
  if p_provider_place_id is not null and p_provider_place_id <> '' then
    select id into v_place_id from public.places
    where provider_place_id = p_provider_place_id limit 1;
  end if;
  if v_place_id is null then
    select id into v_place_id from public.places
    where extensions.st_dwithin(location,
      extensions.st_setsrid(extensions.st_makepoint(p_longitude, p_latitude), 4326)::geography, 10)
    and name = p_name limit 1;
  end if;
  if v_place_id is not null then
    update public.places set
      name = coalesce(p_name, name),
      formatted_address = coalesce(p_formatted_address, formatted_address),
      latitude = p_latitude, longitude = p_longitude,
      city = coalesce(p_city, city), region = coalesce(p_region, region),
      country = coalesce(p_country, country),
      metadata_json = coalesce(p_metadata_json, metadata_json),
      provider_place_id = coalesce(p_provider_place_id, provider_place_id),
      usage_count = usage_count + 1, last_synced_at = now()
    where id = v_place_id;
  else
    insert into public.places (
      provider, provider_place_id, name, formatted_address,
      latitude, longitude, city, region, country, metadata_json
    ) values (
      p_provider, nullif(p_provider_place_id, ''), p_name, p_formatted_address,
      p_latitude, p_longitude, p_city, p_region, p_country, p_metadata_json
    ) returning id into v_place_id;
  end if;
  return v_place_id;
end;
$$;

-- 7. RPC: Record usage
create or replace function public.record_user_place_usage(
  p_user_id uuid, p_place_id uuid, p_kind text default 'recent'
) returns void language plpgsql security definer as $$
begin
  insert into public.user_recent_places (user_id, place_id, kind, use_count, last_used_at)
  values (p_user_id, p_place_id, p_kind, 1, now())
  on conflict (user_id, place_id, kind) do update set
    use_count = user_recent_places.use_count + 1, last_used_at = now();
end;
$$;

-- 8. RLS
alter table public.places enable row level security;
alter table public.user_recent_places enable row level security;

create policy "Anyone can read active places"
  on public.places for select using (is_active = true);
create policy "Service role can manage places"
  on public.places for all using (true) with check (true);
create policy "Users can read own recent places"
  on public.user_recent_places for select using (auth.uid() = user_id);
create policy "Users can manage own recent places"
  on public.user_recent_places for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
