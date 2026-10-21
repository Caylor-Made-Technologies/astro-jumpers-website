-- =====================================================================
-- Astro Jumpers: database setup for Supabase
-- Run this in Supabase: Dashboard → SQL Editor → New query → paste → Run.
-- It is safe to run again (it only creates or updates what's needed).
-- Then run seed.sql to add the 10 placeholder rentals.
--
-- Who can do what (enforced here, not in the website code):
--   Visitors  → read active rentals; see WHICH units are taken on WHICH dates
--               (unit id + date only); submit a booking request. Nothing else.
--   Owner     → signed in AND listed in public.admins: full access.
-- =====================================================================

-- Business-local "today" (the server clock is UTC).
create or replace function public.local_today()
returns date
language sql stable
set search_path = public
as $$ select (now() at time zone 'America/Chicago')::date $$;

-- ---------- Rentals ("units") ----------
create table if not exists public.units (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (length(trim(name)) > 0),
  type        text not null check (length(trim(type)) > 0),   -- e.g. Bounce House, Combo, Water Slide
  size        text,                                            -- e.g. 13' x 13'
  price       numeric(8,2) check (price is null or price >= 0), -- per day; empty = "Price TBD"
  description text,
  photo_url   text,
  active      boolean not null default true,                   -- false = hidden from the public site
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ---------- Admins: who may manage everything ----------
-- Being signed in is not enough; the account must also be listed here.
create table if not exists public.admins (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

-- ---------- Bookings ----------
create table if not exists public.bookings (
  id            uuid primary key default gen_random_uuid(),
  unit_id       uuid not null references public.units(id) on delete restrict,
  event_date    date not null,
  customer_name text,
  notes         text,
  created_at    timestamptz not null default now()
);
-- Columns added after the first version (safe to re-run).
alter table public.bookings add column if not exists phone             text;
alter table public.bookings add column if not exists email             text;
alter table public.bookings add column if not exists event_address     text;
alter table public.bookings add column if not exists town              text;
alter table public.bookings add column if not exists status            text not null default 'pending';
alter table public.bookings add column if not exists terms_accepted    boolean not null default false;
alter table public.bookings add column if not exists terms_accepted_at timestamptz;
alter table public.bookings add column if not exists confirmed_at      timestamptz;
alter table public.bookings add column if not exists cancelled_at      timestamptz;
alter table public.bookings add column if not exists updated_at        timestamptz not null default now();

alter table public.bookings drop constraint if exists bookings_status_check;
alter table public.bookings add constraint bookings_status_check
  check (status in ('pending', 'confirmed', 'cancelled'));

-- ONE ACTIVE BOOKING PER UNIT PER DATE, enforced by the database.
-- Pending requests hold the date too; cancelling a booking frees it.
alter table public.bookings drop constraint if exists bookings_unit_id_event_date_key;
create unique index if not exists bookings_one_active_per_unit_date
  on public.bookings (unit_id, event_date)
  where status in ('pending', 'confirmed');
create index if not exists bookings_event_date_idx on public.bookings (event_date);

-- ---------- Blocked dates (maintenance, days off) ----------
-- unit_id = null blocks ALL units that day.
create table if not exists public.blocked_dates (
  id         uuid primary key default gen_random_uuid(),
  unit_id    uuid references public.units(id) on delete cascade,
  block_date date not null,
  reason     text,
  created_at timestamptz not null default now()
);
create unique index if not exists blocked_dates_unique
  on public.blocked_dates (coalesce(unit_id, '00000000-0000-0000-0000-000000000000'::uuid), block_date);

-- ---------- Booking validation (runs for every new/changed booking) ----------
create or replace function public.validate_booking()
returns trigger
language plpgsql
security definer          -- needs to look at other bookings for the rate limit
set search_path = public
as $$
declare
  admin boolean := public.is_admin();
  jwt_role text := coalesce(
    nullif(current_setting('request.jwt.claim.role', true), ''),
    nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role');
  -- Trusted = the owner, or SQL run in the Supabase dashboard / server code (no website visitor).
  trusted boolean := admin or jwt_role is null or jwt_role = 'service_role';
  digits text;
  recent int;
begin
  if tg_op = 'UPDATE' then
    -- Only admins reach updates (RLS). Keep timestamps in step with status.
    if new.status is distinct from old.status then
      if new.status = 'confirmed' then new.confirmed_at := now(); end if;
      if new.status = 'cancelled' then new.cancelled_at := now(); end if;
    end if;
    new.updated_at := now();
    return new;
  end if;

  -- INSERT --------------------------------------------------------------
  new.customer_name := nullif(trim(new.customer_name), '');
  new.email         := nullif(lower(trim(new.email)), '');
  new.event_address := nullif(trim(new.event_address), '');
  new.town          := nullif(trim(new.town), '');
  new.notes         := nullif(trim(new.notes), '');
  new.created_at    := now();
  new.updated_at    := now();

  -- Phone: keep digits only; accept 10 digits (or 11 starting with 1).
  if new.phone is not null then
    digits := regexp_replace(new.phone, '\D', '', 'g');
    if length(digits) = 11 and left(digits, 1) = '1' then digits := substr(digits, 2); end if;
    new.phone := nullif(digits, '');
  end if;

  if not trusted then
    -- Requests from the public website.
    new.status := 'pending';
    new.confirmed_at := null;
    new.cancelled_at := null;

    if new.customer_name is null or length(new.customer_name) > 100 then
      raise exception 'Please enter your name.' using errcode = '22023';
    end if;
    if new.phone is null or new.phone !~ '^[2-9][0-9]{2}[2-9][0-9]{6}$' then
      raise exception 'Please enter a valid 10-digit phone number.' using errcode = '22023';
    end if;
    if new.email is null or length(new.email) > 200
       or new.email !~ '^[^@\s]+@[^@\s]+\.[A-Za-z]{2,}$' then
      raise exception 'Please enter a valid email address.' using errcode = '22023';
    end if;
    if new.event_address is null or length(new.event_address) > 200 then
      raise exception 'Please enter the event address.' using errcode = '22023';
    end if;
    if new.town is null or length(new.town) > 60 then
      raise exception 'Please choose a town.' using errcode = '22023';
    end if;
    if length(coalesce(new.notes, '')) > 1000 then
      raise exception 'Notes are too long (1000 characters max).' using errcode = '22023';
    end if;
    if not new.terms_accepted then
      raise exception 'Please confirm you are 18 or older and agree to the Rental Terms and Privacy Policy.' using errcode = '22023';
    end if;
    new.terms_accepted_at := now();

    if new.event_date <= public.local_today() then
      raise exception 'Online bookings must be for tomorrow or later. For today, please call us.' using errcode = '22023';
    end if;

    -- Simple spam/abuse limits.
    select count(*) into recent from public.bookings
      where created_at > now() - interval '1 hour'
        and (email = new.email or phone = new.phone);
    if recent >= 3 then
      raise exception 'Too many booking requests. Please call us instead.' using errcode = '22023';
    end if;
    select count(*) into recent from public.bookings
      where created_at > now() - interval '10 minutes' and status = 'pending';
    if recent >= 20 then
      raise exception 'We are getting a lot of requests right now. Please try again in a few minutes or call us.' using errcode = '22023';
    end if;
  end if;

  -- Rules for everyone (including the owner).
  if new.event_date < public.local_today() and jwt_role is not null then
    raise exception 'That date has already passed.' using errcode = '22023';
  end if;
  if new.event_date > public.local_today() + 365 then
    raise exception 'Bookings can be made up to one year ahead.' using errcode = '22023';
  end if;
  if not exists (select 1 from public.units where id = new.unit_id and (active or trusted)) then
    raise exception 'That rental is not available.' using errcode = '22023';
  end if;
  if new.status in ('pending', 'confirmed') and exists (
       select 1 from public.blocked_dates
       where block_date = new.event_date and (unit_id is null or unit_id = new.unit_id)) then
    raise exception 'That rental is not available on that date.' using errcode = '22023';
  end if;
  if new.status = 'confirmed' then new.confirmed_at := coalesce(new.confirmed_at, now()); end if;

  return new;
end;
$$;

drop trigger if exists bookings_validate on public.bookings;
create trigger bookings_validate
  before insert or update on public.bookings
  for each row execute function public.validate_booking();

-- ---------- Public availability: unit id + date ONLY ----------
-- Returns every (unit, date) that is taken: active bookings and blocked dates.
-- Never returns names, phones, emails, addresses, notes, or status.
drop function if exists public.booked_units(date);
create or replace function public.unit_availability(p_from date, p_to date)
returns table (unit_id uuid, event_date date)
language sql stable security definer
set search_path = public
as $$
  select b.unit_id, b.event_date
    from public.bookings b
   where b.status in ('pending', 'confirmed')
     and b.event_date between p_from and least(p_to, p_from + 62)
  union
  select coalesce(d.unit_id, u.id), d.block_date
    from public.blocked_dates d
    join public.units u on d.unit_id is null or u.id = d.unit_id
   where d.block_date between p_from and least(p_to, p_from + 62);
$$;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = public
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

-- ---------- Booking emails: tell the booking-notify Edge Function ----------
-- Calls the function on every new or changed booking. The shared secret lives in
-- Supabase Vault (never in this file). One-time setup, with your own long random value:
--   select vault.create_secret('PASTE-WEBHOOK_SECRET-HERE', 'booking_webhook_secret');
-- Use this OR a dashboard Database Webhook, not both, or emails will be sent twice.
-- If you use a different Supabase project, change the URL below.
create extension if not exists pg_net with schema extensions;

create or replace function public.notify_booking_webhook()
returns trigger
language plpgsql
security definer          -- needs to read the secret from Vault
set search_path = public, extensions
as $$
declare
  secret text;
begin
  select decrypted_secret into secret from vault.decrypted_secrets where name = 'booking_webhook_secret';
  perform net.http_post(
    url := 'https://manbzbtoolbyrvqlxzfl.supabase.co/functions/v1/booking-notify',
    body := jsonb_build_object(
      'type', tg_op,
      'table', tg_table_name,
      'schema', tg_table_schema,
      'record', to_jsonb(new),
      'old_record', case when tg_op = 'UPDATE' then to_jsonb(old) end),
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-webhook-secret', coalesce(secret, '')),
    timeout_milliseconds := 5000);
  return new;
end;
$$;

drop trigger if exists booking_notify_webhook on public.bookings;
create trigger booking_notify_webhook
  after insert or update on public.bookings
  for each row execute function public.notify_booking_webhook();

-- ---------- Row Level Security: ON for every table ----------
alter table public.units         enable row level security;
alter table public.bookings      enable row level security;
alter table public.blocked_dates enable row level security;
alter table public.admins        enable row level security;

-- Units
drop policy if exists "Anyone can see active units" on public.units;
create policy "Anyone can see active units" on public.units
  for select to anon, authenticated
  using (active or public.is_admin());

drop policy if exists "Admins manage units" on public.units;
create policy "Admins manage units" on public.units
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Bookings: the public may only INSERT (as pending). No select/update/delete.
drop policy if exists "Public can request a booking" on public.bookings;
create policy "Public can request a booking" on public.bookings
  for insert to anon, authenticated
  with check (status = 'pending' or public.is_admin());

drop policy if exists "Admins manage bookings" on public.bookings;
create policy "Admins manage bookings" on public.bookings
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Blocked dates: admins only (the public sees them through unit_availability()).
drop policy if exists "Admins manage blocked dates" on public.blocked_dates;
create policy "Admins manage blocked dates" on public.blocked_dates
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Admins table: you can only see whether YOU are an admin.
drop policy if exists "Users can see their own admin row" on public.admins;
create policy "Users can see their own admin row" on public.admins
  for select to authenticated
  using (user_id = auth.uid());

-- ---------- Table/column permissions ----------
-- (Newer Supabase projects don't expose tables to the API automatically, and
--  older ones expose too much, so set them explicitly.)
grant usage on schema public to anon, authenticated;

revoke all on public.units, public.bookings, public.blocked_dates, public.admins from anon, authenticated;
grant select on public.units to anon, authenticated;
grant insert, update, delete on public.units to authenticated;

-- Visitors can fill in only these booking fields (not status, timestamps, etc.).
grant insert (id, unit_id, event_date, customer_name, phone, email, event_address, town, notes, terms_accepted)
  on public.bookings to anon;
grant select, insert, update, delete on public.bookings to authenticated;
grant select, insert, update, delete on public.blocked_dates to authenticated;
grant select on public.admins to authenticated;

revoke execute on function public.is_admin() from public;
revoke execute on function public.unit_availability(date, date) from public;
revoke execute on function public.validate_booking() from public, anon, authenticated;
revoke execute on function public.notify_booking_webhook() from public, anon, authenticated;
revoke execute on function public.touch_updated_at() from public, anon, authenticated;
grant execute on function public.is_admin() to anon, authenticated;
grant execute on function public.unit_availability(date, date) to anon, authenticated;
grant execute on function public.local_today() to anon, authenticated;

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
