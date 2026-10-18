-- =====================================================================
-- Astro Jumpers: 10 placeholder rentals (+ 2 sample bookings)
-- Run after schema.sql: Dashboard → SQL Editor → paste → Run.
-- Only adds rentals if the table is empty, so running it twice won't duplicate.
-- Edit or hide these from admin.html once real rentals are added.
-- =====================================================================

insert into public.units (name, type, size, price, description, photo_url)
select * from (values
  ('Classic Bounce House', 'Bounce House', '13'' x 13''', null::numeric, '[PLACEHOLDER] A roomy, colorful jumper that''s perfect for birthday parties and backyard fun.', 'assets/placeholders/classic-bounce-house.svg'),
  ('Rocket Castle Bouncer', 'Bounce House', '15'' x 15''', null::numeric, '[PLACEHOLDER] A castle-style bouncer with rocket towers and a big jumping area.', 'assets/placeholders/rocket-castle.svg'),
  ('Moon Mini Toddler Bounce', 'Bounce House', '10'' x 10''', null::numeric, '[PLACEHOLDER] Low walls and a soft entry ramp for the littlest astronauts.', 'assets/placeholders/moon-mini.svg'),
  ('Galaxy Combo with Slide', 'Combo', '15'' x 20''', null::numeric, '[PLACEHOLDER] Bounce area, climbing wall, and a slide all in one. A crowd favorite.', 'assets/placeholders/galaxy-combo.svg'),
  ('Lunar Lander Combo', 'Combo', '18'' x 22''', null::numeric, '[PLACEHOLDER] Basketball hoop, pop-up obstacles, and a slide out the front hatch.', 'assets/placeholders/lunar-lander-combo.svg'),
  ('Meteor Wet/Dry Combo', 'Combo', '16'' x 24''', null::numeric, '[PLACEHOLDER] Use it dry for bouncing or hook up a hose for a splash landing.', 'assets/placeholders/meteor-wet-dry.svg'),
  ('Saturn Splash Water Slide', 'Water Slide', '12'' x 30''', null::numeric, '[PLACEHOLDER] Beat the Panhandle heat with a tall water slide and splash pool.', 'assets/placeholders/saturn-splash.svg'),
  ('Comet Dual-Lane Water Slide', 'Water Slide', '16'' x 35''', null::numeric, '[PLACEHOLDER] Two lanes so friends can race to the splash zone.', 'assets/placeholders/comet-dual-lane.svg'),
  ('Asteroid Obstacle Course', 'Obstacle Course', '10'' x 40''', null::numeric, '[PLACEHOLDER] Tunnels, pop-ups, and a slide finish. Race your friends!', 'assets/placeholders/asteroid-obstacle.svg'),
  ('Space Race 60'' Obstacle Course', 'Obstacle Course', '12'' x 60''', null::numeric, '[PLACEHOLDER] Our longest course, great for school events and big parties.', 'assets/placeholders/space-race-60.svg')
) as v(name, type, size, price, description, photo_url)
where not exists (select 1 from public.units);

-- Two sample CONFIRMED bookings next Saturday so you can see "On a Mission".
-- Cancel or delete them from the Bookings tab in admin.html whenever you like.
insert into public.bookings (unit_id, event_date, customer_name, phone, email, event_address, town, notes, status, terms_accepted)
select u.id,
       public.local_today() + (((6 - extract(dow from public.local_today())::int + 6) % 7) + 1),
       'Sample Customer', '8060000000', 'sample@example.com', '123 Sample St', 'Hereford',
       'Placeholder booking: delete me', 'confirmed', true
from public.units u
where u.name in ('Rocket Castle Bouncer', 'Saturn Splash Water Slide')
  and not exists (select 1 from public.bookings b where b.unit_id = u.id and b.customer_name = 'Sample Customer');
