-- =====================================================================
-- Astro Jumpers: database setup for Supabase
-- Run this once in Supabase: Dashboard → SQL Editor → New query → paste → Run.
-- It is safe to run again; it only creates what's missing.
-- Then run seed.sql to add the 10 placeholder rentals.
-- =====================================================================

-- ---------- Rentals ("units") ----------
create table if not exists public.units (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (length(trim(name)) > 0),
  type        text not null check (length(trim(type)) > 0),  -- e.g. Bounce House, Combo, Water Slide
  size        text,                                           -- e.g. 13' x 13'
  price       numeric(8,2) check (price is null or price >= 0), -- per day; empty = "Price TBD"
  description text,
  photo_url   text,
  active      boolean not null default true,                  -- false = hidden from the public site
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ---------- Bookings: which unit is out on which date ----------
-- A unit with a booking on the chosen date shows as "On a Mission".
create table if not exists public.bookings (
  id            uuid primary key default gen_random_uuid(),
  unit_id       uuid not null references public.units(id) on delete cascade,
  event_date    date not null,
  customer_name text,
  notes         text,
  created_at    timestamptz not null default now(),
  unique (unit_id, event_date)
);
create index if not exists bookings_event_date_idx on public.bookings (event_date);

-- ---------- Admins: who may edit ----------
-- Being signed in is not enough; the account must also be listed here.
create table if not exists public.admins (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- ---------- Helpers ----------
create or replace function public.is_admin()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

-- Public availability check: returns only unit ids, never customer details.
create or replace function public.booked_units(p_date date)
returns table (unit_id uuid)
language sql stable security definer
set search_path = public
as $$
  select b.unit_id from public.bookings b where b.event_date = p_date;
$$;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists units_touch_updated_at on public.units;
create trigger units_touch_updated_at
  before update on public.units
  for each row execute function public.touch_updated_at();

-- ---------- Row Level Security ----------
alter table public.units    enable row level security;
alter table public.bookings enable row level security;
alter table public.admins   enable row level security;

drop policy if exists "Anyone can see active units" on public.units;
create policy "Anyone can see active units" on public.units
  for select to anon, authenticated
  using (active or public.is_admin());

drop policy if exists "Admins manage units" on public.units;
create policy "Admins manage units" on public.units
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Admins manage bookings" on public.bookings;
create policy "Admins manage bookings" on public.bookings
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Users can see their own admin row" on public.admins;
create policy "Users can see their own admin row" on public.admins
  for select to authenticated
  using (user_id = auth.uid());

-- Explicit grants (newer Supabase projects don't expose tables to the API automatically).
grant usage on schema public to anon, authenticated;
grant select on public.units to anon, authenticated;
grant insert, update, delete on public.units to authenticated;
grant select, insert, update, delete on public.bookings to authenticated;
grant select on public.admins to authenticated;
revoke execute on function public.is_admin() from public;
revoke execute on function public.booked_units(date) from public;
grant execute on function public.is_admin() to anon, authenticated;
grant execute on function public.booked_units(date) to anon, authenticated;

-- ---------- Photo storage ----------
-- Public bucket: anyone can view photos by URL; only admins can upload/replace/delete.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('unit-photos', 'unit-photos', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

drop policy if exists "Admins list unit photos" on storage.objects;
create policy "Admins list unit photos" on storage.objects
  for select to authenticated
  using (bucket_id = 'unit-photos' and public.is_admin());

drop policy if exists "Admins upload unit photos" on storage.objects;
create policy "Admins upload unit photos" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'unit-photos' and public.is_admin());

drop policy if exists "Admins update unit photos" on storage.objects;
create policy "Admins update unit photos" on storage.objects
  for update to authenticated
  using (bucket_id = 'unit-photos' and public.is_admin());

drop policy if exists "Admins delete unit photos" on storage.objects;
create policy "Admins delete unit photos" on storage.objects
  for delete to authenticated
  using (bucket_id = 'unit-photos' and public.is_admin());
