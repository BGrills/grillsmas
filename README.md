# 🎄 Grillsmas HQ

The Official Grills Family Christmas Organizer: a password-protected site where the family can

- 📅 add when they'll be in Whistler and block off days or evenings,
- 🎁 keep wish lists and claim gifts for each other (you never see claims on your own list),
- 🍪 request baking from Chantelle and dinners from Brendan.

It runs free on **Cloudflare Workers**: static files in `public/`, a small Worker in `src/` that checks the password and runs the API, and a **D1** (SQLite) database.

```
wrangler.jsonc     Cloudflare settings: Worker name, database, files folder
public/            the website (HTML, CSS, JS — no build step)
src/
  worker.js        every request starts here: password gate, then API or files
  api.js           the API (calendar, gifts, food requests)
lib/
  config.js        ← family names, emojis, dates, chefs: edit this
  auth.js, db.js   password cookie + database setup (tables auto-create)
```

## Deploy

Already set up: the Worker `grillsmas` is connected to this repo, and the D1 database `grillsmas` is wired in through `wrangler.jsonc`. The one manual step:

1. In Cloudflare go to **Workers & Pages → grillsmas → Settings → Variables and Secrets → Add**. Choose type **Secret**, name it `FAMILY_PASSWORD`, and enter the family password (not case-sensitive). Click **Deploy**. (`keep_vars` in `wrangler.jsonc` also protects it if it was saved as plain text.)

Every push to `main` builds and deploys automatically; watch it under **grillsmas → Deployments** (or **Builds**). The site lives at `https://grillsmas.brendan-grills.workers.dev`, shown on the Worker's overview page.

**Renaming the Worker?** The `name` in `wrangler.jsonc` must match the Worker's name in the dashboard, or builds fail.

## Changing things

- **People, emojis, dates, chefs:** edit `lib/config.js` and commit.
- **Changing the password:** update the `FAMILY_PASSWORD` secret. Everyone gets logged out and needs the new one.
- **Looking at or fixing data by hand:** D1 → `grillsmas` → **Console** lets you run SQL, e.g. `SELECT * FROM gifts;`.

## Running it locally (optional)

```bash
npm i -g wrangler
echo 'FAMILY_PASSWORD=rudolph' > .dev.vars
wrangler dev          # uses a local copy of the database
```

## Privacy notes

- Every page and API call requires the password cookie. The site also sends `noindex` headers and a `robots.txt` that blocks search engines.
- "Who you are" is chosen from a list and trusted, which is fine for family but not a security boundary. Anyone with the password could pick someone else's name.
- The no-peeking rule hides claims from the list owner on the server, not just on the page.

## Secret features

Type **hohoho** anywhere. Click the star five times. Turn on **Jingle mode** if you dare.
