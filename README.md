# Astro Jumpers website

One-page website for **Astro Jumpers**, bounce house and inflatable rentals in Hereford, Texas.

Plain HTML, CSS, and JavaScript. No frameworks, no build step, no `npm install`. Upload the folder anywhere that hosts static files (Netlify, GitHub Pages, etc.) and it works.

```
index.html          Page layout + SEO tags (title, description, social preview)
admin.html          ★ Owner's page: add/edit/hide rentals, upload photos, mark booked dates
content.js          ★ Editable content: towns, fees, FAQ, reviews, contact, hours + Supabase settings
supabase/           Database setup: schema.sql (tables + security rules), seed.sql (10 placeholder rentals)
css/styles.css      Look and feel. Colors + fonts are CSS variables at the top
css/admin.css       Extra styles for the admin page
js/main.js          Builds the page from content.js; menu, FAQ, and form behavior
js/units.js         Rental cards, party-date availability, type filters
js/admin.js         The admin page
js/vendor/          Supabase's JavaScript library (used by the admin page only)
js/starfield.js     Twinkling star background
assets/             Logo, favicons, social image, placeholder rental images, gallery photos
tools/make-icons.py One-time helper that crops the logo and makes favicons (only rerun if the logo changes)
```

Rentals live in a free **Supabase** database so the owner can manage them from a phone at `/admin.html`. Everything else is edited in `content.js`.

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

### One-time setup (about 15 minutes)
1. **Create a free project** at [supabase.com](https://supabase.com) → *New project*. Pick any name and a strong database password (save it somewhere; you won't need it day to day).
2. **Create the tables:** in the project, open **SQL Editor → New query**, paste everything from `supabase/schema.sql`, and click **Run**. Then do the same with `supabase/seed.sql` to add the 10 placeholder rentals.
3. **Create the owner's login:** **Authentication → Users → Add user → Create new user**. Enter the email and a password, and tick *Auto Confirm User*.
4. **Make that login an admin:** back in **SQL Editor**, run (with the real email):
   ```sql
   insert into public.admins (user_id)
   select id from auth.users where email = 'astrojumpersco@gmail.com';
   ```
   Only accounts on this list can change anything, even if someone else manages to sign up.
5. **Turn off public sign-ups** (extra safety): **Authentication → Sign In / Providers** → turn off *Allow new users to sign up*.
6. **Password-reset links:** **Authentication → URL Configuration** → set *Site URL* to `https://caylor-made-technologies.github.io/astro-jumpers-website/` and add `https://caylor-made-technologies.github.io/astro-jumpers-website/admin.html` under *Redirect URLs*.
7. **Connect the website:** **Project Settings → API** (or *Data API*). Copy the *Project URL* and the **anon / public** key into `content.js`:
   ```js
   supabase: {
     url: "https://abcdefgh.supabase.co",
     anonKey: "eyJhbGciOi..."
   },
   ```
   The anon key is safe to publish; the database rules in `schema.sql` decide what it can do. **Never** paste the `service_role` key into the website.
8. Commit and push. The site now loads rentals from Supabase, and the admin page is at **/admin.html** (it isn't linked from the site, so bookmark it).

### Using the admin page
- **Rentals tab:** *＋ Add rental*, *Edit*, and *Hide/Show*. Hidden rentals disappear from the website but stay in the list so you can bring them back. Leave the price blank to show "Price TBD".
- **Photos:** tap *Upload photo* in the editor. Phone photos are shrunk to about 1600 px wide automatically, so they load fast. Landscape (4:3) photos look best. Replacing a photo doesn't delete the old file; you can clean those up in Supabase → Storage → `unit-photos` if you ever want to.
- **Bookings tab:** pick a date and a rental to mark it booked. On that date the rental shows **🚀 On a Mission** and moves to the bottom of the list. Customer name and notes are private (only signed-in admins can read them). Remove a booking if plans change.
- `seed.sql` adds 2 sample bookings for the next Saturday so you can see the "On a Mission" look. Remove them from the Bookings tab.

### How the public rentals section works
- Parents pick a **party date** in the bar that sticks to the top of the screen while they scroll the rentals. Available rentals are listed first; booked ones drop to the bottom with "🚀 On a Mission".
- **Filter chips** (All, Bounce House, Combo, …) are built from the rental types you use in admin, so a new type gets its own chip automatically.
- **Show only available** hides booked rentals for the chosen date.
- Choosing a date also fills in the date on the quote form, and *Request This One* fills in the rental.
- If Supabase can't be reached, the site quietly shows the backup list from `content.js`, so the page never breaks.

Good to know: free Supabase projects pause after about a week with no activity. If that happens, the site shows the backup list until you open the project in the Supabase dashboard and click *Restore*.

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

## Connecting the booking form

The form is front-end only until you pick a service. Set this in `content.js`:

### Option A: Netlify Forms (easiest if hosting on Netlify)
```js
form: { provider: "netlify", ... }
```
That's it. Netlify detects the form when you deploy (the `data-netlify="true"` attribute is already on it). Submissions appear in the Netlify dashboard under **Forms**, and you can turn on email notifications there (*Forms → Form notifications*). A hidden spam trap is already built in.

### Option B: Formspree (works on any host, including GitHub Pages)
1. Make a free form at [formspree.io](https://formspree.io) and copy its endpoint, like `https://formspree.io/f/abcd1234`.
2. In `content.js`:
```js
form: { provider: "formspree", formspreeEndpoint: "https://formspree.io/f/abcd1234", ... }
```

While `provider` is `"none"`, the form shows the thank-you message but **doesn't send anything**.

Fields sent: `name`, `phone`, `email`, `event_date`, `event_address`, `event_town`, `rental`, `surface`, `notes`.

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
   Use Formspree for the form here (Netlify Forms only works on Netlify).

The site's address is already set to the GitHub Pages URL above. If you switch to Netlify or a custom domain, update it in `index.html` and `content.js`.

---

## Before launch checklist
- [x] Real phone and email
- [ ] Real Facebook and Instagram links (`content.js`)
- [ ] Supabase set up (see **Rentals & bookings**) and owner can sign in to `admin.html`
- [ ] Real rentals, prices, and photos added in admin; placeholder rentals hidden
- [ ] Sample bookings removed
- [ ] Delivery fees, deposit and cancellation terms in the FAQ
- [ ] Safety text reviewed (match the manufacturer's rules and your insurance)
- [ ] Real reviews (with permission)
- [ ] Form provider connected and a test submission received
- [x] Web address set (GitHub Pages; update if you get a custom domain)
- [ ] No more yellow dashed outlines on the page
