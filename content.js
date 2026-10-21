/* =====================================================================
   ASTRO JUMPERS — SITE CONTENT
   ---------------------------------------------------------------------
   This is the ONLY file you need to edit to update the website.
   Rentals, prices, towns, fees, FAQ, reviews, contact info, hours,
   and image paths all live here. The page builds itself from it.

   Tips:
   - Keep the quotes "like this" around text, and a comma after each item.
   - Anything marked [PLACEHOLDER] or "TBD" still needs real info.
   - Image paths are relative to index.html, e.g. "assets/rentals/castle.jpg".
     Leave an image as "" to show a labeled gray placeholder box instead.
   ===================================================================== */

window.SITE = {

  /* ---------- Business & contact ---------- */
  business: {
    name: "Astro Jumpers",
    tagline: "Out-of-this-world fun for your next party!",
    intro: "Bounce houses, combos, and water slides delivered, set up, and picked up across Hereford and the Texas Panhandle.",
    city: "Hereford",
    state: "TX",
    zip: "79045",
    // Phone: "display" is what people see; "dial" is digits only for tap-to-call.
    phone: { display: "(806) 382-2097", dial: "+18063822097" },
    email: "astrojumpersco@gmail.com",
    logo: "assets/logo-cropped.jpg",     // big logo in the hero
    logoIcon: "assets/logo-icon.png",    // small round badge in the header/footer
    // Where the site will live once it's online (used for social sharing + Google).
    siteUrl: "https://caylor-made-technologies.github.io/astro-jumpers-website",  // update if you get a custom domain
  },

  socials: [
    // Remove a line to hide that icon. Add the real page links when ready.
    { name: "Facebook",  url: "https://facebook.com/YOUR-PAGE" },   // [PLACEHOLDER]
    { name: "Instagram", url: "https://instagram.com/YOUR-HANDLE" } // [PLACEHOLDER]
  ],

  hours: [
    // [PLACEHOLDER] hours — edit freely, add or remove lines.
    { days: "Mon – Fri", time: "9:00 AM – 7:00 PM" },
    { days: "Saturday",  time: "8:00 AM – 8:00 PM" },
    { days: "Sunday",    time: "By appointment" }
  ],

  /* ---------- Service area ----------
     Hereford and surrounding towns out to Amarillo, Olton, and Hart.
     Add a town by adding a new "Name" to the list. It shows up in the
     Service Area section, the footer, and the booking form automatically. */
  towns: [
    "Hereford",
    "Amarillo",
    "Canyon",
    "Dimmitt",
    "Friona",
    "Vega",
    "Olton",
    "Hart",
    "Wildorado",
    "Umbarger"
  ],

  delivery: {
    note: "[PLACEHOLDER] Delivery is free in Hereford. A small travel fee applies to surrounding towns, based on distance. Don't see your town? Ask us!",
    fees: [
      // [PLACEHOLDER] fees — set real amounts when ready.
      { area: "Hereford",                    fee: "Free" },
      { area: "Within 25 miles",             fee: "TBD" },
      { area: "25–50 miles (e.g. Amarillo)", fee: "TBD" },
      { area: "50+ miles",                   fee: "Call for quote" }
    ]
  },

  /* ---------- Rentals (Supabase) ----------
     Rentals now live in a Supabase database so the owner can manage them
     from admin.html (add, edit, hide, upload photos, mark dates booked).
     Fill in these two values from Supabase → Project Settings → API.
     The "anon" key is meant to be public; the database rules keep it safe.
     NEVER paste the "service_role" key here. */
  supabase: {
    url: "https://manbzbtoolbyrvqlxzfl.supabase.co",
    anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1hbmJ6YnRvb2xieXJ2cWx4emZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIzMDQyODUsImV4cCI6MjEwNzg4MDI4NX0.aO-E5YLBMFunUbBLJ_TCOYElwzPmtuv7hgfts2Rj8J0"
  },

  /* Backup list: shown ONLY if Supabase isn't set up yet or can't be reached.
     Once Supabase is connected, edit rentals in admin.html, not here. */
  fallbackUnits: [
    { id: "classic-bounce-house", name: "Classic Bounce House", type: "Bounce House", size: "13' x 13'", price: null,
      description: "[PLACEHOLDER] A roomy, colorful jumper that's perfect for birthday parties and backyard fun.",
      photo_url: "assets/placeholders/classic-bounce-house.svg" },
    { id: "rocket-castle", name: "Rocket Castle Bouncer", type: "Bounce House", size: "15' x 15'", price: null,
      description: "[PLACEHOLDER] A castle-style bouncer with rocket towers and a big jumping area.",
      photo_url: "assets/placeholders/rocket-castle.svg" },
    { id: "moon-mini", name: "Moon Mini Toddler Bounce", type: "Bounce House", size: "10' x 10'", price: null,
      description: "[PLACEHOLDER] Low walls and a soft entry ramp for the littlest astronauts.",
      photo_url: "assets/placeholders/moon-mini.svg" },
    { id: "galaxy-combo", name: "Galaxy Combo with Slide", type: "Combo", size: "15' x 20'", price: null,
      description: "[PLACEHOLDER] Bounce area, climbing wall, and a slide all in one. A crowd favorite.",
      photo_url: "assets/placeholders/galaxy-combo.svg" },
    { id: "lunar-lander-combo", name: "Lunar Lander Combo", type: "Combo", size: "18' x 22'", price: null,
      description: "[PLACEHOLDER] Basketball hoop, pop-up obstacles, and a slide out the front hatch.",
      photo_url: "assets/placeholders/lunar-lander-combo.svg" },
    { id: "meteor-wet-dry", name: "Meteor Wet/Dry Combo", type: "Combo", size: "16' x 24'", price: null,
      description: "[PLACEHOLDER] Use it dry for bouncing or hook up a hose for a splash landing.",
      photo_url: "assets/placeholders/meteor-wet-dry.svg" },
    { id: "saturn-splash", name: "Saturn Splash Water Slide", type: "Water Slide", size: "12' x 30'", price: null,
      description: "[PLACEHOLDER] Beat the Panhandle heat with a tall water slide and splash pool.",
      photo_url: "assets/placeholders/saturn-splash.svg" },
    { id: "comet-dual-lane", name: "Comet Dual-Lane Water Slide", type: "Water Slide", size: "16' x 35'", price: null,
      description: "[PLACEHOLDER] Two lanes so friends can race to the splash zone.",
      photo_url: "assets/placeholders/comet-dual-lane.svg" },
    { id: "asteroid-obstacle", name: "Asteroid Obstacle Course", type: "Obstacle Course", size: "10' x 40'", price: null,
      description: "[PLACEHOLDER] Tunnels, pop-ups, and a slide finish. Race your friends!",
      photo_url: "assets/placeholders/asteroid-obstacle.svg" },
    { id: "space-race-60", name: "Space Race 60' Obstacle Course", type: "Obstacle Course", size: "12' x 60'", price: null,
      description: "[PLACEHOLDER] Our longest course, great for school events and big parties.",
      photo_url: "assets/placeholders/space-race-60.svg" }
  ],


  /* ---------- How it works (3 steps) ---------- */
  steps: [
    { icon: "🚀", title: "Pick your jumper",        text: "Browse our rentals and send a booking request with your date and town." },
    { icon: "🛸", title: "We deliver & set up",      text: "We arrive before the party, set everything up safely, and show you the rules." },
    { icon: "🎉", title: "You party!",              text: "Enjoy the fun. When it's over, we take it down and haul it away." }
  ],

  /* ---------- Safety & rules ---------- */
  safety: [
    { icon: "🌱", title: "Setup surface",     text: "[PLACEHOLDER] We set up on flat grass (staked) or concrete/driveways (sandbags). No gravel, rocks, or steep slopes." },
    { icon: "🔌", title: "Power",             text: "[PLACEHOLDER] Each inflatable needs a standard outlet within 50 ft on its own circuit. No outlet? Ask about generator rental." },
    { icon: "🌬️", title: "Weather policy",   text: "[PLACEHOLDER] Inflatables can't be used in winds over 15–20 mph, rain, or lightning. We'll reschedule if the weather won't cooperate." },
    { icon: "👀", title: "Adult supervision", text: "[PLACEHOLDER] A responsible adult must watch the inflatable at all times. Similar-size kids together, no shoes, no silly string or food inside." }
  ],

  /* ---------- FAQ ---------- */
  faq: [
    { q: "How long does setup take?",
      a: "[PLACEHOLDER] Most setups take 20–45 minutes. We usually arrive 1–2 hours before your party starts." },
    { q: "How much space do I need?",
      a: "[PLACEHOLDER] Each rental lists its space needs. Plan for a few extra feet on every side, plus clear overhead room (no low branches or power lines)." },
    { q: "Do you require a deposit?",
      a: "[PLACEHOLDER] A deposit of $TBD holds your date. The rest is due on delivery." },
    { q: "What is your cancellation policy?",
      a: "[PLACEHOLDER] Cancel at least TBD days before your event for a full refund of your deposit." },
    { q: "What if it rains?",
      a: "[PLACEHOLDER] Safety first! If rain, lightning, or high winds are expected, we'll reschedule or refund your deposit, no hassle." },
    { q: "Do you set up on concrete?",
      a: "[PLACEHOLDER] Yes. We use sandbags instead of stakes on concrete, asphalt, or driveways." }
  ],

  /* ---------- Gallery ----------
     Add photos by filling in "src". Recommended size is shown on empty boxes. */
  gallery: [
    { src: "", alt: "Bounce house at a birthday party",  size: "1200 x 1200" },
    { src: "", alt: "Kids on the water slide",           size: "1200 x 1200" },
    { src: "", alt: "Combo setup in a backyard",         size: "1200 x 1200" },
    { src: "", alt: "Obstacle course race",              size: "1200 x 1200" },
    { src: "", alt: "Party guests having fun",           size: "1200 x 1200" },
    { src: "", alt: "Inflatable at a community event",   size: "1200 x 1200" }
  ],

  /* ---------- Reviews ---------- */
  /* Only real reviews from real customers, with their permission, word for word.
     Made-up or edited reviews break FTC rules. The Reviews section and menu link
     stay hidden until at least one review is listed. Example:
     { name: "Jessica R.", town: "Hereford", stars: 5, text: "The kids had a blast!" }, */
  reviews: [
  ],

  /* ---------- Booking form ----------
     Bookings are saved in Supabase (see supabase/ and the README).
     serviceArea is shown on the booking form; the town dropdown uses "towns" above. */
  booking: {
    serviceArea: "We deliver to Hereford, TX and surrounding towns out to Amarillo, Olton, and Hart.",
    confirmWithin: "24 hours"   // shown on the confirmation screen
  }
};
