# Astro Jumpers website

One-page website for **Astro Jumpers**, bounce house and inflatable rentals in Hereford, Texas.

Plain HTML, CSS, and JavaScript. No frameworks, no build step, no `npm install`. Upload the folder anywhere that hosts static files (Netlify, GitHub Pages, etc.) and it works.

```
index.html          Page layout + SEO tags (title, description, social preview)
content.js          ★ ALL editable content: rentals, prices, towns, fees, FAQ, reviews, contact, hours, image paths
css/styles.css      Look and feel. Colors + fonts are CSS variables at the top
js/main.js          Builds the page from content.js; menu, FAQ, and form behavior
js/starfield.js     Twinkling star background
assets/             Logo, favicons, social image, and your photos
  rentals/            put rental photos here
  gallery/            put gallery photos here
tools/make-icons.py One-time helper that crops the logo and makes favicons (only rerun if the logo changes)
```

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

### Change prices, sizes, or descriptions
Find the rental under `rentals:` and edit its fields:
```js
price: "$150",          // shows as "$150 per day"
priceNote: "per day",
size: "13' x 13'",
ages: "Ages 3–12",
placeholder: false,     // removes the yellow "Placeholder" badge
```

### Add a photo to a rental
1. Put the photo in `assets/rentals/`, e.g. `assets/rentals/bounce-house.jpg`.
   Recommended: **1200 × 900 px** (4:3), JPG, under ~300 KB. Free compressor: [squoosh.app](https://squoosh.app).
2. Set the path and a short description for screen readers:
```js
image: "assets/rentals/bounce-house.jpg",
imageAlt: "Blue and orange bounce house set up on a lawn",
```
Leave `image: ""` to keep the gray "Photo coming soon" box. If a path is misspelled, the gray box shows instead of a broken image.

### Add a new rental
Copy a whole `{ ... },` block inside `rentals: [ ... ]`, paste it below, and change the details. Give it a unique `id` (lowercase, dashes, no spaces), like `"castle-combo"`. It automatically shows up as a card **and** in the booking form's "Which rental?" list.

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

## Things that live in `index.html` (search engines read these directly)

Near the top of `index.html`:
- `<title>` and `<meta name="description">`: what shows in Google results.
- `og:` tags: the preview card when someone shares the link on Facebook or by text. Once the site has a real address, replace every `https://example.com` with it (in `index.html` **and** `business.siteUrl` in `content.js`).

The Google "LocalBusiness" info (name, phone, towns served) is generated automatically from `content.js`.

## Colors and fonts

At the top of `css/styles.css`, the `:root { ... }` block holds every color (`--space-800`, `--sky-400`, `--orange-500`, …) and both fonts (`--font-display` for headings, `--font-body` for text). Change one value and it updates everywhere.

## Replacing the logo

1. Save the new logo as `assets/logo.jpg`.
2. Run `python3 tools/make-icons.py` (needs Python 3 and `pip install pillow`).
   It trims any black bars off the top and bottom and makes `logo-cropped.jpg`, the favicons, and `og-image.jpg`. It also prints the logo's main colors in case you want to retune the CSS variables.

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

After deploying, update `https://example.com` in `index.html` and `content.js` to the real address.

---

## Before launch checklist
- [ ] Real phone, email, Facebook, Instagram (`content.js`)
- [ ] Prices, sizes, ages, photos; set `placeholder: false` on each rental
- [ ] Delivery fees, deposit and cancellation terms in the FAQ
- [ ] Safety text reviewed (match the manufacturer's rules and your insurance)
- [ ] Real reviews (with permission)
- [ ] Form provider connected and a test submission received
- [ ] `example.com` replaced with the real web address
- [ ] No more yellow dashed outlines on the page
