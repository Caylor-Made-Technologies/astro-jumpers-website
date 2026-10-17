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
    phone: { display: "(806) 000-0000", dial: "+18060000000" },   // [PLACEHOLDER]
    email: "hello@example.com",                                    // [PLACEHOLDER]
    logo: "assets/logo-cropped.jpg",
    // Where the site will live once it's online (used for social sharing + Google).
    siteUrl: "https://example.com",                                // [PLACEHOLDER]
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

  /* ---------- Rentals ----------
     Copy one { ... } block to add a new rental. "id" must be unique,
     lowercase, no spaces (it's used behind the scenes). */
  rentals: [
    {
      id: "bounce-house",
      name: "Classic Bounce House",
      placeholder: true,                 // set to false once the info is real
      description: "[PLACEHOLDER] A roomy, colorful jumper that's perfect for birthday parties and backyard fun.",
      image: "",                         // e.g. "assets/rentals/bounce-house.jpg"
      imageAlt: "Classic bounce house set up in a backyard",
      size: "13' x 13' (TBD)",
      space: "Needs about 17' x 17' of flat space (TBD)",
      ages: "Ages 3–12 (TBD)",
      price: "TBD",
      priceNote: "per day"
    },
    {
      id: "combo-slide",
      name: "Combo with Slide",
      placeholder: true,
      description: "[PLACEHOLDER] Bounce area, climbing wall, and a slide all in one. A crowd favorite.",
      image: "",
      imageAlt: "Bounce house combo with a slide",
      size: "15' x 20' (TBD)",
      space: "Needs about 20' x 25' of flat space (TBD)",
      ages: "Ages 4–12 (TBD)",
      price: "TBD",
      priceNote: "per day"
    },
    {
      id: "water-slide",
      name: "Water Slide",
      placeholder: true,
      description: "[PLACEHOLDER] Beat the Panhandle heat with a tall inflatable water slide and splash pool.",
      image: "",
      imageAlt: "Inflatable water slide with a splash pool",
      size: "12' x 30' (TBD)",
      space: "Needs about 17' x 40' of flat grass (TBD)",
      ages: "Ages 5+ (TBD)",
      price: "TBD",
      priceNote: "per day"
    },
    {
      id: "obstacle-course",
      name: "Obstacle Course",
      placeholder: true,
      description: "[PLACEHOLDER] Race your friends through tunnels, pop-ups, and a slide finish.",
      image: "",
      imageAlt: "Inflatable obstacle course",
      size: "10' x 40' (TBD)",
      space: "Needs about 15' x 50' of flat space (TBD)",
      ages: "Ages 5+ (TBD)",
      price: "TBD",
      priceNote: "per day"
    }
  ],

  /* ---------- How it works (3 steps) ---------- */
  steps: [
    { icon: "🚀", title: "Pick your jumper",        text: "Browse our rentals and send a quote request with your date and town." },
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
  reviews: [
    { name: "[PLACEHOLDER] Jessica R.", town: "Hereford", stars: 5,
      text: "Placeholder review. The kids had a blast and setup was quick and easy!" },
    { name: "[PLACEHOLDER] Marcus T.",  town: "Amarillo", stars: 5,
      text: "Placeholder review. On time, super clean, and friendly. We'll book again." },
    { name: "[PLACEHOLDER] Ana G.",     town: "Hart",     stars: 5,
      text: "Placeholder review. The water slide was the hit of the summer party." }
  ],

  /* ---------- Booking form ----------
     provider: "none"      → form shows a thank-you message but sends nothing (for testing)
               "netlify"   → uses Netlify Forms (works automatically when hosted on Netlify)
               "formspree" → set formspreeEndpoint to your form's URL, e.g. "https://formspree.io/f/abcd1234" */
  form: {
    provider: "none",
    formspreeEndpoint: "",
    successMessage: "Thanks! Your request is in orbit. We'll reach out soon to confirm availability and pricing.",
    errorMessage: "Hmm, something went wrong sending your request. Please call or text us instead."
  }
};
