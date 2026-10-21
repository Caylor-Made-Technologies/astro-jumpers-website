# Astro Jumpers website

One-page website for **Astro Jumpers**, bounce house and inflatable rentals in Hereford, Texas.

Plain HTML, CSS, and JavaScript. No frameworks, no build step, no `npm install`. Upload the folder anywhere that hosts static files (Netlify, GitHub Pages, etc.) and it works.

```
index.html          Page layout + SEO tags (title, description, social preview)
admin.html          ★ Owner's page: bookings (confirm/cancel), blocked dates, rentals, photos
privacy.html        Privacy Policy (fill in the [PLACEHOLDER] parts)
terms.html          Rental Terms, refunds, and website Terms of Service (fill in the [PLACEHOLDER] parts)
content.js          ★ Editable content: towns, fees, FAQ, reviews, contact, hours + Supabase settings
supabase/           Database setup: schema.sql (tables + security rules), seed.sql (10 placeholder rentals)
supabase/functions/ booking-notify: the Edge Function that sends booking emails
css/styles.css      Look and feel. Colors + fonts are CSS variables at the top
css/admin.css       Extra styles for the admin page
js/main.js          Builds the page from content.js; menu, FAQ, and form behavior
js/units.js         Rental cards, party-date availability, type filters
js/booking.js       The booking form (validation, spam trap, confirmation screen)
js/admin.js         The admin page
js/vendor/          Supabase's JavaScript library (used by the admin page only)
js/starfield.js     Twinkling star background
assets/             Logo, favicons, social image, fonts, placeholder rental images, gallery photos
tools/make-icons.py One-time helper that crops the logo and makes favicons (only rerun if the logo changes)
```

Rentals and bookings live in a free **Supabase** database. Customers book on the site; the owner manages everything from a phone at `/admin.html`. Everything else is edited in `content.js`.

---

## Preview it on your computer

The page loads `content.js` with a normal `<script>` tag, so you can **double-click `index.html`** and it opens in your browser.

For a preview that behaves exactly like the live site, run a tiny local server from this folder:

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

(Or in VS Code, install the **Live Server** extension, right-click `index.html`, and choose *Open with Live Server*.)

Tip: anything that still says `[PLACEHOLDER]` or `TBD` gets a faint yellow dashed outline on the page, so you can spot what's left to fill in.

---

## Everyday edits (all in `content.js`)

Open `content.js` in any text editor. Keep the `"quotes"` and the commas between items.

### Rentals, prices, and photos → use `admin.html`
Rentals are managed on the admin page, not in this file. See **Rentals & bookings (Supabase)** below.
`content.js` only keeps a backup list (`fallbackUnits`) that's shown if Supabase isn't set up yet or can't be reached.

### Add or remove a town
Edit the `towns:` list:
```js
towns: ["Hereford", "Amarillo", "Canyon", "Olton", "Hart", "Tulia"],
```
Towns update in the Service Area section, the footer, the booking form dropdown, and the Google business info.

### Delivery fees
Edit `delivery.fees` (one line per zone) and `delivery.note`.

### FAQ, safety rules, reviews, hours
Edit the `faq`, `safety`, `reviews`, and `hours` lists. Add or remove items freely.

### Gallery photos
Put photos in `assets/gallery/` (recommended **1200 × 1200 px**, square) and fill in `src`:
```js
{ src: "assets/gallery/birthday-1.jpg", alt: "Kids jumping at a birthday party", size: "1200 x 1200" },
```

### Phone, email, socials
Edit `business.phone` (both `display` and `dial`), `business.email`, and `socials`. Every "Call" button and link on the site updates from here.
`dial` must be digits only with country code, e.g. `"+18065551234"`.

---

## Rentals & bookings (Supabase)

### How it works
- **Customers** pick a party date. Rentals booked (or blocked) that day show **🚀 On a Mission** and can't be booked; the rest show **✅ Ready for Launch** with a **Book** button.
- The **booking form** checks everything before sending (required fields, a real 10-digit phone, a valid email, tomorrow or later, up to a year ahead, terms accepted) and shows a **confirmation screen** with a booking number. Every new booking starts as **pending**.
- The **owner** gets an email for each new booking, then confirms or cancels it in `admin.html`. The customer gets a "booking received" email, then a "you're confirmed" email when the owner confirms.
- **One active booking per rental per date** is enforced by the database itself (a unique index on pending + confirmed bookings), so double-booking is impossible even if two people click at the same moment. Cancelling a booking frees the date.

### Privacy & security (all enforced in `supabase/schema.sql`)
- Row-level security is **on for every table**.
- Visitors can **only** read active rentals and call `unit_availability()`, which returns **rental id + date only**: never names, phones, emails, addresses, or notes.
- Visitors can **insert** a booking (always saved as *pending*, and only these fields: rental, date, name, phone, email, address, town, notes, terms). They **can't read, edit, or delete** any booking, including their own.
- The database re-checks every rule itself (dates, phone, email, terms, blocked dates, hidden rentals), so nobody can skip the form's checks.
- **Spam protection:** a hidden "honeypot" field catches form bots, and the database limits each email/phone to 3 requests per hour (plus a site-wide burst limit).
- Only a signed-in account **listed in the `admins` table** can see booking details or change anything.
- The website only ever uses the public **anon** key. The **service role key** and email API key live only in Supabase's Edge Function secrets (environment variables), never in this repo or the browser.

### One-time setup (about 30 minutes)
1. **Create a free project** at [supabase.com](https://supabase.com) → *New project*. Save the database password somewhere safe.
2. **Create the tables:** **SQL Editor → New query**, paste all of `supabase/schema.sql`, **Run**. Then do the same with `supabase/seed.sql` (10 placeholder rentals + 2 sample bookings).
3. **Create the owner's login:** **Authentication → Users → Add user → Create new user** with the email and a strong password; tick *Auto Confirm User*.
4. **Make that login an admin** (SQL Editor, with the real email):
   ```sql
   insert into public.admins (user_id)
   select id from auth.users where email = 'astrojumpersco@gmail.com';
   ```
5. **Turn off public sign-ups:** **Authentication → Sign In / Providers** → turn off *Allow new users to sign up*.
6. **Password-reset links:** **Authentication → URL Configuration** → *Site URL* `https://caylor-made-technologies.github.io/astro-jumpers-website/`, and add `https://caylor-made-technologies.github.io/astro-jumpers-website/admin.html` under *Redirect URLs*.
7. **Connect the website:** **Project Settings → API**. Copy the *Project URL* and the **anon / public** key into `content.js`:
   ```js
   supabase: { url: "https://abcdefgh.supabase.co", anonKey: "eyJhbGciOi..." },
   ```
   The anon key is meant to be public. **Never** put the `service_role` key in the website.
8. Commit and push. Bookings now work, and the admin page is at **/admin.html** (bookmark it; it isn't linked from the site).

### Email notifications (one-time, about 15 minutes)
Emails are sent by a small Supabase **Edge Function** (`supabase/functions/booking-notify`) that runs whenever a booking is added or changed.

1. **Pick an email service** (both have free plans):
   - **Brevo** (recommended for now): works with the Gmail address. Sign up at [brevo.com](https://www.brevo.com), verify `astrojumpersco@gmail.com` as a sender (**Senders, Domains & Dedicated IPs → Senders**), and create an API key (**SMTP & API → API Keys**).
   - **Resend**: better once you own a domain (e.g. `astrojumperstx.com`); it requires verifying that domain.
2. **Deploy the function** with the [Supabase CLI](https://supabase.com/docs/guides/cli) from this folder:
   ```bash
   supabase login
   supabase link --project-ref YOUR-PROJECT-REF
   supabase functions deploy booking-notify --no-verify-jwt
   ```
   (`--no-verify-jwt` is correct here: the function checks its own secret instead.)
3. **Set the secrets:** copy `supabase/functions/booking-notify/env.example` to `.env` in the same folder (git ignores it), fill it in, then:
   ```bash
   supabase secrets set --env-file supabase/functions/booking-notify/.env
   ```
   For `WEBHOOK_SECRET`, use a long random string (for example, run `openssl rand -hex 32`).
4. **Connect bookings to the function:** `schema.sql` already adds a database trigger that calls `booking-notify`. Give it the secret once (SQL Editor, with the same `WEBHOOK_SECRET` value):
   ```sql
   select vault.create_secret('PASTE-WEBHOOK_SECRET-HERE', 'booking_webhook_secret');
   ```
   (Don't also create a dashboard Database Webhook, or every email goes out twice.)
5. Make a test booking on the site. You should get the owner email, and the customer address gets "booking received". Confirm it in admin to get "you're confirmed". If something's off, check **Edge Functions → booking-notify → Logs**.

An email failure never blocks or undoes a booking; it just shows up in the function's logs.

### Using the admin page
- **Bookings tab:** upcoming bookings grouped by date, with a yellow badge counting pending ones. **✅ Confirm** emails the customer; **Cancel** frees the date. Tap a phone number or email to call or write. Use *Add a phone booking* for bookings you take by phone (saved as confirmed; same-day is allowed here).
- **Blocked tab:** block one day or a range (up to 31 days) for **all rentals** or one rental, for maintenance or days off. Blocked rentals show "On a Mission" and can't be booked online. It warns you if bookings already exist on those dates.
- **Rentals tab:** *＋ Add rental*, *Edit*, *Hide/Show*, and photo upload (phone photos are shrunk automatically). Hidden rentals disappear from the site but stay in the list.
- **Someone asks you to delete their info:** set the Bookings filter to *Cancelled* or *Past bookings*, find them, and tap **🗑️ Delete**. That removes the booking and their name, phone, email, and address for good. (Cancel an upcoming booking first.) The Privacy Policy promises to do this within 45 days.
- The 2 sample bookings from `seed.sql` (next Saturday) are just for show: cancel them in the Bookings tab.

### Good to know
- Free Supabase projects pause after about a week with no activity. If that happens, the site shows the backup rental list from `content.js` and booking is unavailable until you click *Restore* in the Supabase dashboard.
- "Today" for booking rules means **Central Time** (Hereford), not the server's clock.
- To change the service-area sentence on the booking form, edit `booking.serviceArea` in `content.js`.

## Security, privacy, and legal (built in)
- **Content Security Policy** in every `.html` file: the browser only runs this site's own scripts and only talks to our Supabase project. If you ever change Supabase projects, update the address in those `<meta http-equiv="Content-Security-Policy">` lines.
- **No third parties in visitors' browsers:** fonts are hosted in `assets/fonts/`, and there's no analytics or ad tracking. That's why the site needs **no cookie banner**. If you ever add Google Analytics, a Facebook pixel, or similar, update the Privacy Policy and add a consent banner first.
- **Secrets stay out of git:** `.gitignore` blocks `.env` files. Only the public anon key is in `content.js`.
- **Reviews:** the Reviews section stays hidden until you add real ones in `content.js`. Only post real reviews, word for word, with the customer's OK (fake reviews break FTC rules).
- **Booking form:** customers confirm they're 18+, agree to the Rental Terms and Privacy Policy, and agree to be contacted about the booking. The time they agreed is saved with the booking.
- **Emails** are only about bookings (no marketing), so they don't need an unsubscribe link. Each one says why it was sent. If you ever send promotions, you'll need an unsubscribe link and the business address.
- The admin page refuses to load inside another website's frame.

### Licenses
- Fonts: Fredoka and Nunito, SIL Open Font License (`assets/fonts/OFL-*.txt`).
- Supabase JS library: MIT (`js/vendor/supabase-LICENSE.txt`).
- Logo: owned by Astro Jumpers. Placeholder rental drawings were made for this site.
- Only use rental and gallery photos you took or have permission to use (manufacturer photos usually need permission).

## Things that live in `index.html` (search engines read these directly)

Near the top of `index.html`:
- `<title>` and `<meta name="description">`: what shows in Google results.
- `og:` tags: the preview card when someone shares the link on Facebook or by text. They currently point to the GitHub Pages address, `https://caylor-made-technologies.github.io/astro-jumpers-website/`. If you get a custom domain, replace that address everywhere it appears (in `index.html` **and** `business.siteUrl` in `content.js`).

The Google "LocalBusiness" info (name, phone, towns served) is generated automatically from `content.js`.

## Colors and fonts

At the top of `css/styles.css`, the `:root { ... }` block holds every color (`--space-800`, `--sky-400`, `--orange-500`, …) and both fonts (`--font-display` for headings, `--font-body` for text). Change one value and it updates everywhere.

## Replacing the logo

1. Save the new logo as `assets/logo.jpg`.
2. Run `python3 tools/make-icons.py` (needs Python 3 and `pip install pillow`).
   It trims the black bars and white frame and makes `logo-cropped.jpg` (hero), `logo-icon.png` (header/footer badge), the favicons, and `og-image.jpg`. It also prints the logo's main colors in case you want to retune the CSS variables.
   The small icons are a close-up of the astronaut, because the full logo is unreadable at 16–32 px. If a new logo is laid out differently, adjust `ICON_BOX` at the top of the script.

---

## Deploying (free)

### Netlify
1. Sign in at [app.netlify.com](https://app.netlify.com) → **Add new site → Import an existing project** → pick this GitHub repo.
2. Build command: *(leave empty)*. Publish directory: `/` (the repo root).
3. Deploy. Every push to `main` redeploys automatically.
   (Or drag the whole folder onto [app.netlify.com/drop](https://app.netlify.com/drop) to deploy without GitHub.)
4. Add your own domain under **Domain management** if you buy one.

### GitHub Pages
1. On GitHub: **Settings → Pages → Build and deployment → Source: Deploy from a branch**.
2. Branch: `main`, folder: `/ (root)` → **Save**.
3. The site appears at `https://<your-account>.github.io/astro-jumpers-website/` in a minute or two.

The site's address is already set to the GitHub Pages URL above. If you switch to Netlify or a custom domain, update it in `index.html` and `content.js`.

---

## Before launch checklist
- [x] Real phone and email
- [ ] Real Facebook and Instagram links (`content.js`)
- [ ] Supabase set up (see **Rentals & bookings**) and owner can sign in to `admin.html`
- [ ] Public sign-ups turned off in Supabase
- [ ] Real rentals, prices, and photos added in admin; placeholder rentals hidden
- [ ] Sample bookings cancelled
- [ ] Delivery fees, deposit and cancellation terms in the FAQ
- [ ] Safety text reviewed (match the manufacturer's rules and your insurance)
- [ ] Real reviews (with permission)
- [ ] Email notifications set up and a test booking received (owner + customer emails)
- [ ] Rental Terms and Privacy Policy placeholders filled in and reviewed (deposit, cancellation, refunds, retention, email provider)
- [ ] In Supabase **Authentication → Providers → Email**: turn on *leaked password protection* and use a long, unique admin password
- [x] Web address set (GitHub Pages; update if you get a custom domain)
- [ ] No more yellow dashed outlines on the page
