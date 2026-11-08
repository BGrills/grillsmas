# 🎄 Grillsmas HQ

The Official Grills Family Christmas Organizer: a password-protected site where the family can

- 📅 add when they'll be in Whistler and block off days or evenings,
- 🎁 keep wish lists and claim gifts for each other (you never see claims on your own list),
- 🍪 request baking from Chantelle and dinners from Brendan.

It's built to run free on **Cloudflare Pages**: static files in `public/`, a small API in `functions/`, and a **D1** (SQLite) database.

```
public/            the website (HTML, CSS, JS — no build step)
functions/         server code Cloudflare runs on each request
  _middleware.js   password gate + "don't index me" headers
  api/[[path]].js  the API (calendar, gifts, food requests)
lib/
  config.js        ← family names, emojis, dates, chefs: edit this
  auth.js, db.js   password cookie + database setup (tables auto-create)
```

## Deploy (one time, ~10 minutes)

1. **Make a free Cloudflare account** at <https://dash.cloudflare.com/sign-up>.
2. **Create the database:** in the dashboard go to **Storage & Databases → D1 SQL Database → Create**. Name it `grillsmas`. (You don't need to run any SQL; the site creates its own tables.)
3. **Create the site:** go to **Workers & Pages → Create → Pages → Connect to Git**. Authorize GitHub and pick `BGrills/grillsmas`. Use these build settings:
   - Framework preset: **None**
   - Build command: *(leave empty)*
   - Build output directory: `public`

   Choose a project name; that becomes your URL, e.g. `grillsmas.pages.dev`. Click **Save and Deploy**.
4. **Connect the database:** open the new project, then **Settings → Bindings → Add → D1 database**. Set the variable name to `DB` (exactly) and pick `grillsmas`.
5. **Set the family password:** go to **Settings → Variables and Secrets → Add**. Choose type **Secret**, name it `FAMILY_PASSWORD`, and enter a value like `rudolph2026`. The password isn't case-sensitive.
6. **Redeploy** so the binding and password take effect: go to **Deployments**, open the ⋯ menu on the latest deployment, and choose **Retry deployment**.
7. Visit your `*.pages.dev` URL, log in, pick your name and send the link plus password to the family. 🎉

From then on, every push to `main` redeploys automatically.

## Changing things

- **People, emojis, dates, chefs:** edit `lib/config.js` and commit.
- **Changing the password:** update the `FAMILY_PASSWORD` secret and redeploy. Everyone gets logged out and needs the new one.
- **Looking at or fixing data by hand:** D1 → `grillsmas` → **Console** lets you run SQL, e.g. `SELECT * FROM gifts;`.

## Running it locally (optional)

```bash
npm i -g wrangler
echo 'FAMILY_PASSWORD=rudolph' > .dev.vars
wrangler pages dev public --d1 DB=grillsmas-local
```

## Privacy notes

- Every page and API call requires the password cookie. The site also sends `noindex` headers and a `robots.txt` that blocks search engines.
- "Who you are" is chosen from a list and trusted, which is fine for family but not a security boundary. Anyone with the password could pick someone else's name.
- The no-peeking rule hides claims from the list owner on the server, not just on the page.

## Secret features

Type **hohoho** anywhere. Click the star five times. Turn on **Jingle mode** if you dare.
