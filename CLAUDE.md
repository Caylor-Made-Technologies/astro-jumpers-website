# CLAUDE.md

Astro Jumpers website, a client project of Caylor Made Technologies. See README.md for how the site works.

## Project memory (Obsidian vault)
The full history, decisions, and next steps for this project live in the
`Caylor-Made-Technologies/obsidian-vault` repo at `Projects/Astro Jumpers.md`.

- **At the start of a session**, if the task involves a decision or you need background,
  attach `Caylor-Made-Technologies/obsidian-vault` and read `Projects/Astro Jumpers.md`
  and the vault's `CLAUDE.md`.
- **Before the session ends**, whenever anything changed, attach the vault repo and update
  `Projects/Astro Jumpers.md`:
  - a dated line under **Log** saying what changed
  - any new decision and its reason under **Decisions**
  - updated **Status**, **Launch checklist**, and next steps
  Commit and push that to the vault's `main` branch.
- Never copy keys, passwords, or customer personal info into the vault.

## Working here
- Plain HTML, CSS, and vanilla JS. No framework, no build step. Keep it that way.
- Editable content goes in `content.js`; rentals and bookings live in Supabase and are managed in `admin.html`.
- Only the public anon key belongs in the site. Never add the service role key.
- Jonathon is usually on his phone: keep explanations short.
- No Claude or Anthropic naming anywhere: no "Co-Authored-By: Claude" or session links in commits or PRs, no `claude/` branch names, no "Generated with Claude" text, no mentions in site files. `_config.yml` keeps this file off the live site.
