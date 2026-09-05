# costafotiadis.com — agent guide

Source for costafotiadis.com: an Astro 5 static site, served by a dependency-free Node server on Railway. Content is Markdown under `src/content/`, images under `src/images/`.

## Status (as of 2026-09-04)

- **www.costafotiadis.com is served by this build on Railway** since 2026-09-02. Writing now happens in this repo; every push to `main` deploys.
- **Ghost Pro was cancelled on 2026-09-04.** There is no rollback any more: this repo is the only copy of the site, and the raw exports in `~/Work/ghost-exports` are the only copy of the Ghost data (backed up off this machine on 2026-09-04).
- Railway project `website`, service `website`, also reachable at the generated domain https://website-production-7020.up.railway.app. Deploys from `main` of `CostaFot/costafotiadis.com`.
- Umami only records hits from `www.costafotiadis.com`/`costafotiadis.com` (`data-domains` on the tag), so the generated Railway host stays out of the stats.
- stats.costafotiadis.com was folded in as `/stats/` on 2026-09-02 and its Wix CNAME and verify TXT deleted the same day (no redirect; only Costa used the subdomain). The `stats` Railway project (`2c7806df-fbe0-4f85-9808-c52d0851bc32`) is scheduled for deletion on Railway and may still show up in project listings until it goes. The collector and the `data` branch stay in `CostaFot/stats`; its old `site/`, `server.js` and `railway.json` were dropped the same day (commit b47175b there).
- `claps-api` CORS allows www, the bare apex, and the generated host (commit 3d5dd82 in `CostaFot/claps-api`, deployed 2026-09-02). Verify with `curl -H 'Origin: …' -I https://claps-api-production.up.railway.app/` and look at `access-control-allow-origin`.
- **The things feed was folded in as `/things/` on 2026-09-03** (entries, images, tags, capture script and the `/things` skill all live here now; see the Things section). things.costafotiadis.com was dropped without a redirect; the Wix CNAME was deleted on 2026-09-03. The `things` service and its volume in the `things-bot` project are scheduled for deletion on Railway (they may still appear in listings until then). Its Umami website was deleted and `CostaFot/things` archived on 2026-09-03 (its history is the old entry database). Videos come from a `media` volume on the `website` service.
- **Email subscriptions went live on 2026-09-04** through Buttondown: a footer form plus a drafts-only send workflow driven by an `email: true` frontmatter flag (see the Newsletter section). Two posts were flagged as the tests that day (interviews, Chrome extension) and both were sent.
- **The six Medium stories that were never brought over are here since 2026-09-04** (Retrofit review, its sequel, Glide review, Kotlin (over) Flow review, RecyclerView in 2019, RxJava in 5 minutes), imported from browser captures with `scripts/medium-import.js` (see Medium import). All six carry `popular: false`, so their beers never rank on `/tag/popular/`. Their Medium clappers were **deliberately not imported** into the claps API (Costa's decision, 2026-09-04): the posts start from zero beers, and `scripts/medium-claps-2.sql` stays in the repo unrun in case that changes. Medium still serves the originals; nothing redirects.
- **The lab was folded in as `/lab/` on 2026-09-03** (nine client-side experiments, three of them on three.js; see the lab bullet under Invariants). **Inappropriate Clippy was added as the tenth on 2026-09-04** and ink dropped the same day (`/lab/ink/` 301s to `/lab/`), so nine remained: `/lab/clippy/`, a port of the Omarchy plugin's behaviour to a page (see the lab bullet). **Black Hole was added as the tenth on 2026-09-04** (`/lab/blackhole/`, a ray-traced Schwarzschild black hole in a raw WebGL shader; see the lab bullet), pinned first with theremin and nebula after it through `FEATURED` in `src/lib/lab.ts`. lab.costafotiadis.com is dropped without a redirect; its Wix CNAME and Umami website were deleted and `CostaFot/lab` archived on 2026-09-03 (its history is the old source). The `lab` Railway project is scheduled for deletion and may show up in project listings until it goes. Nothing from the lab move is outstanding.

## Railway

- Workspace "Costa Fotiadis's Projects" (`324b11f0-cca3-459d-97aa-fc7733e4cb2c`), project `website` (`a3f8e24b-b4f8-4a79-bec2-6202b9bd5b88`), environment `production` (`c72ba765-1567-45df-ad70-cf19668ba09d`), service `website` (`a7b99566-4178-4673-a9b7-9a33703cb232`).
- Source: GitHub `CostaFot/costafotiadis.com`, branch `main`. Builder Railpack, config in `railway.json`. No variables needed; `PORT` is injected.
- Domains: custom `www.costafotiadis.com` (id `c62ef3ea-70e4-457e-b9ed-6537b7a2bf6c`, CNAME target `xol7sq7i.up.railway.app`, Let's Encrypt cert issued 2026-09-02, auto-renews) and the generated https://website-production-7020.up.railway.app. DNS is on Wix — see the DNS section.
- Volume `media` (`76ac9954-7b46-4cb8-88e0-7691fef570d8`) mounted at `/data` (added 2026-09-03 for the things videos). `server.js` serves `$RAILWAY_VOLUME_MOUNT_PATH/media/*` as `/media/*` with Range support; `scripts/things/capture.js` uploads to it with `railway volume files upload`. A service with a volume has a few seconds of downtime per deploy; accepted. The CLI refuses volume deletes from an agent, so ask Costa to run those.
- Related projects in the same workspace: `analytics` (Umami + hit-counter), `claps-api`, `things-bot` (the retired Telegram bot; its `things` site service is scheduled for deletion), `lab` (folded in as `/lab/`; scheduled for deletion), `clippy-leaderboard`, `flagstone`, and `stats` (scheduled for deletion).
- CDN caching is on for the service (Settings → Edge, enabled 2026-09-02): Auto HTML mode, 2 h default TTL, SWR honoured, HTML purged on each deploy. Static assets are cached by content type; HTML is cached because `server.js` sends `s-maxage=3600, stale-while-revalidate=86400` for `.html`/`.xml`/`.txt`/`.md`. Verify with two GETs (not HEAD) of the same URL and look for `x-cache: HIT`. Cache hits never reach the container, so Railway's HTTP metrics undercount; Umami and the hit counter are unaffected. The deploy purge only clears HTML, so `.md`, `.xml` and `.txt` can stay stale for up to an hour after a deploy.
- The cache key is host + path + query (+ encoding), never `Accept` or `User-Agent`. That is why the terminal-client Markdown responses (see Content) are sent with `no-store`, and why the service needs one edge rule (Settings → Edge → Edge Rules, added by hand on 2026-09-02 and verified over the real domain) so those requests skip the cache instead of getting the cached HTML:

  ```json
  { "version": 1, "rules": [ {
    "description": "Terminal clients skip the cache (origin serves them Markdown)", "priority": 10, "enabled": true,
    "if": { "or": [
      { "attr": "http.header", "key": "user-agent", "op": "matches", "value": "curl/*" },
      { "attr": "http.header", "key": "user-agent", "op": "matches", "value": "Wget/*" },
      { "attr": "http.header", "key": "user-agent", "op": "matches", "value": "HTTPie/*" },
      { "attr": "http.header", "key": "user-agent", "op": "matches", "value": "xh/*" },
      { "attr": "http.header", "key": "user-agent", "op": "matches", "value": "aria2/*" } ] },
    "then": { "action": "cache_override", "params": { "bypass": true } } } ] }
  ```

  Without the rule nothing breaks: a `curl` of `/<slug>/` may get the cached HTML, and `/<slug>.md` always works.
- Watch a deploy: `railway deployment list --json --project <id> --service <id> --environment <id>` until `SUCCESS`, then curl the domain.

## Layout

```
astro.config.mjs        site URL is always https://www.costafotiadis.com (canonical), static output, trailing slashes
server.js               serves dist/, plus /images + /content/images -> src/images, /files -> public/files, /media -> volume; 301 table
railway.json            RAILPACK, `npm run build`, `node server.js`
src/content.config.ts   posts + pages + things collections (glob loader); `slug` frontmatter is the entry id for posts/pages, the filename for things
src/content/posts/      YYYY-MM-DD-slug.md
src/content/pages/      <slug>.md
src/content/things/     <id>.json, one per things entry (schema in content.config.ts, written by scripts/things/capture.js)
src/images/YYYY/MM/     mirrors Ghost's /content/images/ layout; Astro optimises everything referenced from Markdown
src/images/things/      things photos (<id>.ext) and link previews (previews/<id>.ext)
src/lib/site.ts         site constants, nav, reserved paths, series detection, date/excerpt helpers
src/lib/things.ts       things helpers: sort, day grouping, tag counts, marks, autolinking, raw image URLs
src/lib/build.ts        commit sha/message/date of this build (RAILWAY_GIT_* on Railway, git locally) for the footer
src/lib/claps.ts        beer counts from the claps API's /top at build time; popularPosts() picks the top five for the homepage and /index.md, skipping posts with `popular: false`
src/lib/elsewhere.ts    the /elsewhere/ list from elsewhere.md's frontmatter, post slugs checked, plus featuredIn(slug) for the post header
src/lib/lab.ts          EXPERIMENTS: globs src/pages/lab/*/index.astro for their `experiment` export; FEATURED slugs first in that order, the rest newest first
src/lib/markdown.ts     Markdown twins of the content: per-entry, /index.md, /llms.txt
src/lib/remark-rewrite-links.mjs   www.costafotiadis.com/<slug>/ -> /<slug>/ at build
src/layouts/Base.astro  head, theme script, header, footer, Umami, hit counter
src/layouts/Lab.astro   Base + post-style header for one experiment; the header alone is search-indexed
src/components/         PostList, PostCard, TagChips, ThemeToggle, Search (Pagefind), ShareBar, Claps, Projects, Elsewhere, Things + ThingsPage (the feed)
src/pages/              index, [slug] (posts AND pages), tag/[tag] + tag/popular (most beers), rss.xml, 404, stats, things/ (index, tag/[tag]), lab/ (index + one folder per experiment), plus [slug].md, index.md, things.md, llms.txt
src/data/stats-apps.json   the extensions on /stats/ (slug, name, repo, storeId); one entry per app, the CI in CostaFot/stats has its own copy
src/data/medium-claps.json  snapshot of Medium claps per story (2026-09-04) mapped to the slug here (all 25 since 2026-09-04); medium-import.js reads it to rewrite cross-links
src/data/things-tags.json  the things tag vocabulary (name -> one-line meaning); the build fails on a tag not in it
public/files/           downloads (the CV)
public/lab/clippy/      the Clippy experiment's assets, copied from CostaFot/omarchy-inappropriate-clippy: map.png + agent.json (the clippy.js sprite sheet), the four sounds as mp3, quotes.json (the book minus the desktop-only keys)
scripts/                Ghost migration tools (see below); scripts/things/ is the feed's capture script
scripts/lib/gist.js     inlines a gist from .gist-cache as fenced blocks (shared by convert.js and medium-import.js)
scripts/medium-import.js   turns the browser captures in exports/medium/ into posts (see Medium import)
scripts/medium-claps.sql   the one-off Medium clappers import into the claps API (ran 2026-09-04; medium-claps-before.json is the before state)
scripts/medium-claps-2.sql   the same for the six stories migrated on 2026-09-04; deliberately not run, see Medium import
scripts/newsletter.mjs  mails newly flagged posts through Buttondown; run by .github/workflows/newsletter.yml
skill/things/           the /things skill (symlinked from ~/.claude/skills/things)
media/                  gitignored local mirror of the Railway volume (videos)
exports/                gitignored; raw Ghost exports live in ~/Work/ghost-exports (they hold the admin user record, never commit them); exports/medium/ holds the six Medium captures
```

## Invariants — keep these true

- Posts and pages are served at `/<slug>/`, never `/blog/<slug>/` or `/posts/<slug>/`. `slug` in frontmatter is the Ghost URL path. `RESERVED` in `src/lib/site.ts` lists paths a slug may not use; the build fails on a collision. `things` is reserved for the feed; the post about it moved from `/things/` to `/building-things/` on 2026-09-03 (its old URL now shows the feed, which links to the post).
- Image paths in Markdown are relative (`../../images/YYYY/MM/name.ext`). Keep that layout; `server.js` also serves the originals at `/images/` and `/content/images/` so old hotlinks map 1:1.
- Internal links in content are site-relative (`/<slug>/`). Old absolute ones are rewritten at build by the remark plugin; do not add new absolute self-links.
- Gists stay inlined as fenced code blocks with an HTML comment naming the source. No gist script embeds.
- No JS is required to read the site. JS is used only for: theme toggle, search, share button, beer button, the live re-rank on `/tag/popular/` (the build snapshot is the no-JS page), and the numbers and charts on `/stats/` (the page shell, app names and links are static). The newsletter form in the footer is plain HTML (see Newsletter).
- `/stats/` is `src/pages/stats.astro`: it fetches the per-app CSVs from the `data` branch of `CostaFot/stats` on raw.githubusercontent.com at page load (the daily GitHub Actions collector lives in that repo) and draws them with Chart.js bundled from npm, line pieces only. Series colours are page-local tokens; chart colours are read from the CSS tokens on every render, and the page re-renders when `data-theme` changes or the OS scheme flips.
- Every post and page has a Markdown twin at `/<slug>.md` (plus `/index.md`, `/things.md` and `/llms.txt`), generated from the raw body with image and internal links made absolute. Browsers get `<link rel="alternate" type="text/markdown">` and a "markdown" link in the footer; `curl`/`wget`/`httpie`/`xh`/`aria2` asking for `/` or `/<slug>/` get the twin unless they send `Accept: text/html`. Tag pages have no twin.
- The things feed (`/things/`, `/things/tag/<tag>/`, `/things.md`) is built from `src/content/things/*.json` by `src/components/ThingsPage.astro` + `Things.astro`. Permalinks are anchors (`/things/#<id>`). Tag filtering is static pages, not JS. Photos and previews go through Astro's image service, with the photo linking to the raw file under `/images/things/`; videos are `<video src="/media/<id>.mp4" poster="/media/<id>.jpg">` from the volume. Only the feed page carries `data-pagefind-body`, so search finds entries but tag pages are not indexed twice.
- The lab (`/lab/`, `/lab/<slug>/`) is static and client-side only: each experiment is `src/pages/lab/<slug>/index.astro`, exports `experiment = { title, description, date }`, wraps its markup in `src/layouts/Lab.astro` and does its work in a `<script>` (three.js is a dependency; Vite only ships it to the pages that import it). No Markdown twins, no API routes: an experiment that needs a server becomes its own Railway service, linked from the index. `/index.md` and `/llms.txt` list the experiments under `## Lab`. Use the global tokens (`--soft` for card backgrounds, `--mono` for HUD text). Static assets an experiment needs go under `public/lab/<slug>/` and are fetched at runtime (`server.js` knows `.mp3`). **`/lab/clippy/` is Inappropriate Clippy** (added 2026-09-04): `src/pages/lab/clippy/index.astro` ports `Clippy.qml` and `ClippySprite.qml` from the plugin repo, a fake bar over a fake desktop, with the plugin's walk, quotes, slap (middle-click, a fast flick across him, a touch swipe, or the HUD button), dodge, ten-slaps knock-out, hold-to-drag, fling-off-the-bar with the long drop, tombstone with epitaph, and the two respawn stunts (tumble, lob). Beats are shortened for a page (quotes every 20–60 s, respawn in 15 s, restless 0.5); no widget avoidance, corner peek, reactions, TTS or leaderboard (browsers cannot send the plugin's User-Agent handshake, and the hint under the HUD says so). The tally is a fake `systemctl status clippy` block under the bar (running / deactivating / auto-restart with the respawn countdown and `signal=SIGSLAP|SIGFLING|SIGKILL` for how he went); the counts, `clean` and `sound` persist in localStorage; `clean` is off by default like the plugin, so the NSFW lines show. Re-copy the assets from the plugin repo when its book or sprites change. **`/lab/blackhole/` is Black Hole** (added 2026-09-04): `src/pages/lab/blackhole/index.astro`, plain WebGL 1 with no three.js, a fullscreen triangle and one fragment shader. Each pixel integrates a photon backwards from the camera with the `-1.5 h² r / |r|⁵` acceleration (Schwarzschild radius as the unit, leapfrog, step `0.035 r` clamped to 0.03–0.5, at most 480 steps, escape at r = 30, captured at r < 1), so the lensed disk, its underside and the photon ring come out of the integration rather than being drawn. The disk is a thin plane from the innermost stable orbit (3 rs) to 14 rs, emissive with partial transparency (front to back compositing, the march stops once transmittance drops under 2 %), its texture 3D value noise in `(r, cos φ, sin φ)` advected with Keplerian differential rotation as two cross-fading copies so the shear never builds up; gravitational redshift always applies, and the `beaming` button toggles the Doppler factor from the orbital speed `sqrt(rs/2r)` (intensity `g^2.5`, blue/red tint by `g`). The sky is two hashed lat/lon star layers (seam-wrapped, thinned near the poles) plus a tilted fbm band; ACES tone map, gamma, dither. Controls: drag orbits (inclination clamped to ±83°, and nudged off exactly edge-on so rays still cross the disk plane), wheel or pinch zooms 4.5–45 rs, arrows and +/- do the same, `reset view` goes home (az 0.6, el 0.16, 24 rs), idle for 2.5 s starts a slow auto-orbit unless `prefers-reduced-motion`. The render scale starts at CSS pixels (DPR capped at 1.5) and adapts every 45 frames to the frame-time EMA (over 30 ms shrinks by 0.8 down to 0.3, under 13 ms grows back to 1); it stops drawing while the canvas is off screen. The HUD line under the canvas is distance, inclination, render size and fps; no WebGL or a failed compile puts a message there instead.
- The footer shows the commit the site was built from, linking to it on GitHub, with `+` after the hash when a local build had uncommitted changes. The full sha is also in `<meta name="build">`. `src/lib/build.ts` reads `RAILWAY_GIT_COMMIT_SHA`/`RAILWAY_GIT_COMMIT_MESSAGE` and falls back to git.
- Design tokens live in `src/styles/global.css`. Code blocks are Night Owl in both themes.
- The Umami website id, claps API, and hit counter URLs live in `src/lib/site.ts`.
- **`/tag/popular/` is the most-beers page**, not a tag: `src/pages/tag/popular.astro` (a static route, so it beats `[tag].astro`, which fails the build on a real tag named `popular`) lists the five posts with the most beers as normal feed cards, each with its count in the meta line, and `TagChips` puts a `🍺 popular` chip after `all` on every chip row. `## Most beers` in `/index.md` is the same list. Counts come at build time from `GET /top?limit=100` on the claps API (`src/lib/claps.ts`; endpoint added to `CostaFot/claps-api` on 2026-09-04). Keys are `https://www.costafotiadis.com/<slug>` with no trailing slash, the same key `Claps.astro` posts to; non-post keys (the homepage, retired URLs) are ignored. The chip and `## Most beers` are as of the last deploy. **The page itself re-ranks live**: the build renders every rankable post as a card in snapshot order (`rankedPosts` in `src/lib/claps.ts`), with all but the top five carrying `hidden`; a script on the page fetches `/top` in the browser, re-sorts the cards by count (ties by date, from each card's `<time>`), rewrites the counts and the `top N` stamp, and unhides the new top five. Cards carry the claps key in `data-url`. When the fetch fails or times out (8 s) nothing moves and the snapshot stands, so a reader without JS or with the API cold sees the page as built (added 2026-09-04). When the API is down or the endpoint is missing the build warns `[claps] no beer counts`, the chip is left out and the page says the bar is closed, so a build never fails on it. `CLAPS_API=http://localhost:4567` points a local build at a mock (a few lines of node serving `/top` from the `claps.json` backup in `CostaFot/claps` will do). The hand-set `Popular` tag on the ViewModel post was dropped on 2026-09-04 for this. A separate block on the homepage was tried the same day and rejected: it belongs in the tag row, not as new furniture. **`popular: false` in a post's frontmatter keeps it out of the ranking** (the page, the chip count and `## Most beers`) whatever its count; the beer button on the post still works. The six 2019–2020 Medium stories carry it: Costa does not want them on the page even with their imported clappers (Retrofit review's 76 would rank third).

## Running

```sh
npm run dev        # astro dev (search shows a "build first" note; everything else works)
npm run build      # astro build + pagefind index -> dist/
npm start          # node server.js on $PORT (default 3000), serves dist/
```

Every push to `main` deploys on Railway. Never commit or push unless explicitly asked.

## Content

- Frontmatter: `title`, `slug`, `date_published`, `date_updated`, `tags`, `excerpt`, `feature_image`, `original_url`. Dates ISO 8601 UTC. `excerpt` is optional; the first paragraph is used otherwise. `email: true` mails the post (see Newsletter). `popular: false` keeps it off `/tag/popular/` (see Invariants); `original_url` is provenance only (the Ghost URL, or the Medium URL for the six imported stories) and is not rendered.
- Series are detected from the title prefix (`Exercises in futility:`, `At the mountains of madness:`, `Android Shorts 🩳:`, `It looks like you're trying to:`) and rendered as an eyebrow + headline. Extend `SERIES` in `src/lib/site.ts` for a new one.
- `/projects/`: the Markdown body of `src/content/pages/projects.md` is the JET section; everything under it comes from the `groups` array in its frontmatter (one rail stamp per group, cards with `title`, `blurb`, optional `image`/`alt`/`wide`, and `links`, first link is the card's target). Rendered by `src/components/Projects.astro`; blurbs allow backticks and `[text](href)` only. Cards without an image render as full-width text rows, so order image cards in pairs (or `wide`) to keep the two-up grid closed. Screenshots for it live in `src/images/2026/09/` and were lifted from the repos' READMEs and listing folders, plus headless-Brave shots of the live sites (`brave --headless=new --window-size=1120,630 --force-dark-mode --virtual-time-budget=10000 --screenshot=…`).
- `/elsewhere/`: where the posts got featured and where Costa turned up (newsletter issues, talks, podcasts). The list is the `elsewhere` array in the frontmatter of `src/content/pages/elsewhere.md`: one group per kind of venue (`name`, optional `note`), each with `items` of `where` (quote it, `#624` is a YAML comment otherwise), `href`, `date`, and either `post` (a post slug; the build fails on an unknown one) or `title` (a talk), plus an optional `note`. Rendered newest first by `src/components/Elsewhere.astro`. A post named by any row gets a "featured in" line under its meta, on the HTML and in its Markdown twin, so nothing about being featured is written into post bodies any more (the two hand-written lines came out on 2026-09-03).
- Videos: put the file on the Railway volume (served from `/media/<name>.mp4` with Range support) and write `<video controls playsinline src="/media/<name>.mp4"></video>` in the Markdown.
- Writing in Costa's voice (posts, README) goes through the `costa-writing-style` skill.

## Newsletter — Buttondown

- Email subscriptions live on Buttondown (username `costafot`, free tier: up to 100 subscribers, API included, no RSS-to-email add-on). The footer form in `src/layouts/Base.astro` is a plain HTML `POST` to `SUBSCRIBE_URL` from `src/lib/site.ts`; no JS, no embed script. Subscribers land on Buttondown's own confirmation page and double opt-in is Buttondown's.
- **A post is mailed by setting `email: true` in its frontmatter.** `.github/workflows/newsletter.yml` runs on every push to `main` that touches `src/content/posts/` and calls `scripts/newsletter.mjs`, which compares the push's `before` and `after` commits and creates one Buttondown email per slug whose flag is new (keyed on the slug, so renaming the file does not re-send; flagging an old post later sends it once). The email is the title, the hero (`feature_image`, linked from `/images/`, so the original file size), the first paragraph (or `excerpt`), and a link to the post; `/rss.xml` stays excerpt-only and nothing else about the site changes.
- **Emails are created as drafts** (`NEWSLETTER_STATUS: draft` in the workflow): Costa sends them from the Buttondown dashboard. Switch the value to `about_to_send` when the drafts have proven the format. The workflow reads the `SECRET_BUTTONDOWN_API_KEY` repo secret (Buttondown → Settings → API) into `BUTTONDOWN_API_KEY` for the script; Costa set the secret on 2026-09-04. `workflow_dispatch` re-runs it against a chosen base commit, dry-run by default.
- Try it locally with `node scripts/newsletter.mjs --dry-run --base HEAD --head worktree` after flagging a post on disk: it prints the email instead of creating it. Without `--dry-run` it needs `BUTTONDOWN_API_KEY` in the environment.
- The look of the email (colours, fonts, footer links, the "Powered by Buttondown" badge on the free tier) is set in Buttondown's dashboard, not in the repo. The site's accent is `#ff8000`.

### Newsletter rules

- "Send this post" / "mail this one" means: add `email: true` to that post's frontmatter (after `date_updated`, before `tags`), dry-run the script to show the email, and commit as `<Post>: flag it for the newsletter`. The push is Costa's call, as always; the action does the rest and the draft waits in Buttondown.
- Never remove `email: true` from a post that has gone out. The script only knows the previous commit, so removing the flag and adding it back later sends the post again.
- A brand-new post can carry the flag in the commit that creates it; it goes out (as a draft) on that push. Leave the flag off a post that is not ready to be mailed.
- Re-running the workflow by hand (`workflow_dispatch`) against the wrong base creates duplicate drafts; they are just drafts, delete them in the dashboard. Keep `dry_run` on until the base is right.
- The action and the Railway deploy both fire on the push and do not know about each other. A failed action (missing secret, Buttondown down) leaves the site deployed and the flag in place; re-run it from the Actions tab with the previous push as the base.
- Heroes are linked at original size (some are 2 MB+). If that ever matters, add a small `email_image` sized for mail next to the hero and teach the script to prefer it; nothing like that exists yet.

## Things — the feed at `/things/`

Links, ideas, notes, photos and videos Costa sends himself, one JSON per entry in `src/content/things/`, captured through the `/things` skill (`skill/things/SKILL.md`), usually from the phone over a Remote Control session. Claude is the only writer. Git is the database, except video files, which live on the Railway volume.

### The voice rule (non-negotiable)

Costa's words are **tidied, not rewritten.**

- Allowed on `text`: fix spelling, fix obvious typos, trim rambling, drop a fragment that is plainly nonsense (a stray word, a half-sentence that goes nowhere).
- Keep his wording, his tone, his slang, his punctuation habits, his lowercase. Keep the spirit of what he said. If in doubt, leave it.
- Never add opinion, facts, adjectives, or "context" *into* `text`.
- If `text` differs from what he typed, store the original verbatim in `text_raw` and show the diff in the reply.

Everything Claude contributes lives in the separate `claude` block (and `title`, `preview`, `tags`) and the site renders it visibly apart from his text, labelled as Claude's. Add it only when it is actually useful; a bare idea usually needs tags and nothing else.

`claude.summary` = one or two plain, factual, third-person sentences about the *thing* (the linked page, the video, the subject of the idea). Not about Costa, not about why it is interesting, no "interesting", "great", "fascinating".

### Entry format — `src/content/things/<id>.json`

```json
{
  "schema": 1,
  "id": "20260817_112946",
  "date": "2026-08-17T12:29:46+01:00",
  "type": "link",
  "source": "claude",
  "text": "berry cool",
  "text_raw": "bery cool",
  "url": "https://youtu.be/D2eLCE2-64I",
  "title": "DEMOCRAWLER // Stellar Blade OST by original singer Pernelle.",
  "preview": { "src": "../../images/things/previews/20260817_112946.jpg", "origin": "https://i.ytimg.com/vi/D2eLCE2-64I/hqdefault.jpg" },
  "tags": ["video"],
  "claude": { "summary": "…", "model": "claude-fable-5", "at": "2026-08-17T12:30:10+01:00" }
}
```

- `id` — UTC `YYYYMMDD_HHMMSS` (optional `_<n>` suffix), equals the filename; the build throws if they differ.
- `date` — local wall-clock time **with offset** (`+01:00`), never `Z`. The page groups by the date part of this string; nothing converts it.
- `type` — `idea` | `note` | `link` | `photo` | `video`. A YouTube link is a `link` (▶️ mark from the URL). `video` is a file Costa recorded.
- `source` — `claude`, or `telegram` on entries migrated from the old bot (those also carry `"migrated": true`).
- `text` — required; may be `""` for a caption-less photo or a link sent with no comment.
- `url` + `title` — required for `link`. `image` — required for `photo`, `../../images/things/<id>.<ext>`. `video` — required for `video`: `media/<id>.<mp4|webm|mov>` on the volume, **not** in git; `poster` (`media/<id>.jpg`, also on the volume) optional. `preview` — optional, links only, `src` is `../../images/things/previews/<id>.<ext>`.
- `tags` — every tag must exist in `src/data/things-tags.json`. A new tag only when none fit, added in the same commit.

The schema in `src/content.config.ts` enforces all of it (unknown keys included), so a bad entry fails `npx astro sync` and the build instead of rendering wrong.

### Rules

- Never rewrite the `text` of an existing entry. The only exception is applying the voice rule to a migrated entry during `/things enrich`.
- Commit messages: `things: add <type> <text[:60]>`, `things: enrich <n> entries`, `things: <what>` for everything else. The `/things` invocation is the authorisation to commit and push that entry, nothing else; the skill checks the tree is clean first.
- Photos attached from the mobile app land in `~/.claude/uploads/<session>/` (from a bb thread: `~/.bb/thread-storage/<thread>/Attachments/`); `capture.js --file` copies them to `src/images/things/<id>.<ext>`. Link previews are downloaded into `src/images/things/previews/` (max 1 MB, else skipped). Never hotlink.
- Videos: `capture.js --type video --file` transcodes with ffmpeg to H.264/AAC mp4 with the index up front, extracts a poster, writes both to `media/<id>.*` (gitignored mirror) and uploads them to the volume. The upload needs the Railway CLI logged in with an SSH key registered. The volume is the only copy that matters: `git revert` of a video entry does not delete the file; `railway volume files delete` does, and only Costa can run it.

## Verify a change

1. `npm run build` passes and prints `Indexed 47 pages` (one per post/page, `/things/`, and one per lab experiment; bump when adding content). The chunk-size warning is three.js (one 500 kB chunk shared by drive, flyover and nebula); the `Duplicate id "projects"` glob-loader warning predates the lab and is harmless. `Duplicate id` warnings naming posts edited since the last build are Astro's stale content store; `rm -rf .astro` and rebuild clears them.
2. `npm run build` also prints no `[claps]` warning, `dist/tag/popular/index.html` has a card per rankable post (five without `hidden`, each with `beers` in its meta, the rest with it) and none of the six `popular: false` posts (`grep -c 'retrofit-review\|glide-review\|rxjava-in-5\|recyclerview-in-2019\|over-flow' dist/tag/popular/index.html` is 0), the chip row on `dist/index.html` has `/tag/popular/`, and `dist/index.md` a `## Most beers` list; if the warning shows, the claps API was unreachable (its cold start can exceed the 5 s timeout; a second build usually gets it) and the chip was skipped, which is fine offline.
3. `node scripts/newsletter.mjs --dry-run --base HEAD~1 --head worktree` runs (usually printing `nothing to send`); with a post flagged on disk it prints that one email.
4. `npm start` (with `media/` holding the videos, or `MEDIA_DIR=…`), then curl: `/` 200, `/<slug>/` 200, `/elsewhere/` 200 and `/elsewhere.md` with the list under `## Newsletters`, `/<slug>` 301 to the slash form, `/tag/android/` 200, `/stats/` 200, `/adb-extension-stats/` 301 to `/stats/`, `/rss.xml` 200, `/content/images/2026/07/image.png` 200, `/things-feed/` 301 to `/things/`, `/nope/` 404. The lab: `/lab/` 200, `/lab` 301, `/lab/drive/` 200 (also for a plain `curl`, as HTML, since there is no twin), `/lab/nope/` 404. The feed: `/things/` 200, `/things/tag/life/` 200, `/images/things/20260902_171522.jpg` 200, `curl -sI -H 'Range: bytes=0-99' /media/20260827_234011.mp4` 206 with `Content-Range`. Then the Markdown side: `/<slug>.md`, `/things.md`, `/index.md` and `/llms.txt` 200 as `text/markdown`/`text/plain`; a plain `curl /<slug>/` returns Markdown with `cache-control: no-store`, while `curl -A Mozilla /<slug>/` and `curl -H 'Accept: text/html' /<slug>/` return HTML with the normal cache header.
5. Open it in a browser (terminal-browser or the Chrome MCP): both themes, phone width, search (`/` key), a post with Kotlin code, an animated GIF, the build line under the visitor counter, `/tag/popular/` (five cards; to see the re-rank, stub `window.fetch` with a made-up `/top` and eval the page's inline script again: the order, counts and stamp change, and a throwing fetch leaves them alone), `/stats/` with live numbers and charts that redraw on the theme toggle, and `/things/` with a photo, a link preview, a playing video and the claude aside, and `/lab/` plus one three.js experiment (drive) and one 2d one (sandbox) animating and taking pointer input in both themes, and `/lab/clippy/` (he greets, walks and talks; the `slap` button shoves him with a line; `kill` shows the grave, a click on it the epitaph, and he is back in 15 s; a fast drag released mid-flight throws him off the bar and down the screen), and `/lab/blackhole/` (the disk shows over and under the hole with a thin ring at the shadow's edge, the right-hand side brighter and bluer until `beaming` is off; a drag orbits, the wheel zooms, and the HUD's render size drops on a slow GPU). Headless Brave renders it with `--use-angle=swiftshader --enable-unsafe-swiftshader --ignore-gpu-blocklist --virtual-time-budget=8000` for a screenshot.
6. After a deploy, `curl -s https://www.costafotiadis.com/ -A Mozilla | grep 'name="build"'` must show the pushed sha; if it shows the previous one the CDN is still serving the old HTML.
7. Every path in the live sitemaps (`sitemap-posts.xml`, `sitemap-pages.xml` on www.costafotiadis.com) must exist as `dist/<path>/index.html` or be in the `REDIRECTS` table in `server.js` (Ghost is gone, but search engines still hold those URLs). Retired so far: `/adb-extension-stats/` (2026-09-02) redirects to `/stats/`; `RETIRED_SLUGS` in `scripts/convert.js` keeps the converter from regenerating it.

## Next phases (in rough order)

1. **Keep `/elsewhere/` current**: built 2026-09-03 with Google's three Wear OS 7 / Live Updates posts that show the Just Eat app, the I/O 2026 slide, four Android Weekly issues and six jetc.dev issues (all verified that day; Android Weekly's author search and jetc.dev's archive were exhausted, Kotlin Weekly never linked a post). droidcon.com republished three posts in 2024–25 but those URLs are dead now, so they were left out. One talk, The Android Circuit (GDG London) on 2026-07-15, with a stage photo. New rows go in `src/content/pages/elsewhere.md`.
2. **Kotlin/Wasm or Compose-for-Web pages**: build the bundle elsewhere, commit the output under `public/<page>/`, mount from an Astro page. Astro does not care what produced the bundle.
3. **Apex on Railway (optional)**: the bare `costafotiadis.com` still goes through the Caddy redirector at `178.128.137.126`. If that box is retired, add the apex as a custom domain on the `website` service and use Wix's A/ALIAS option, since Wix cannot CNAME an apex.

Theme work, if it comes up again: tokens in `src/styles/global.css`, feed in `PostList`/`PostCard`, article in `src/pages/[slug].astro`.

## DNS — the domain is on Wix

Nameservers are `ns8.wixdns.net` / `ns9.wixdns.net`, so **every record is edited in the Wix dashboard** (Domains → costafotiadis.com → DNS records). There is no Cloudflare, no registrar API in play, and no MCP for it: Costa makes these changes by hand. Wix's editor is also the reason the other subdomains are plain CNAMEs.

Live records as of 2026-09-03 (after the cutover edit and the `things` and `lab` CNAME removals):

| Name | Type | Value | What it is |
|---|---|---|---|
| `costafotiadis.com` | A | `178.128.137.126` | redirector (Caddy) → `https://www.costafotiadis.com/` |
| `www` | CNAME | `xol7sq7i.up.railway.app` | Railway `website` service (was `costas-blog-1.ghost.io`, Ghost Pro, until 2026-09-02) |
| `graveyard` | CNAME | `1mkedneh.up.railway.app` | Railway |
| `costafotiadis.com` | TXT | `google-site-verification=…` | leave alone |

No MX records, so **nothing here touches email** — but re-check before changing the apex, in case mail gets added later.

### How the cutover went (2026-09-02) and how to roll back

`www` was a CNAME to `costas-blog-1.ghost.io` (Ghost Pro). Costa changed it in Wix to Railway's target `xol7sq7i.up.railway.app` and added the `_railway-verify.www` TXT record Railway asked for. Railway verified ownership and issued the certificate within about fifteen minutes; the old record's one-hour TTL meant resolvers drifted over during the following hour, with both sides serving the site in the meantime. Verified over the real hostname with `curl --resolve www.costafotiadis.com:443:<railway edge ip>` (skips a stale local resolver): homepage, a post, a tag page, `/rss.xml`, `/content/images/…`, the redirects and a 404.

**Rollback is no longer possible**: Ghost Pro was cancelled on 2026-09-04, so `costas-blog-1.ghost.io` serves nothing. The `_railway-verify.www` TXT record can stay.

## Ghost migration tooling

`scripts/convert.js` turns the newest `exports/*.json` into `src/content/` (`exports/` is gitignored; copy the file in from `~/Work/ghost-exports/`). It overwrites files; use `--only-new` to add posts from a fresh export without touching hand-edited ones. `scripts/download-assets.js` mirrors Ghost-hosted assets into `src/images/` and `public/files/`. `scripts/localize-remote-images.js` pulls third-party-hosted images (Medium, Wix) into `src/images/` and rewrites the Markdown; safe to rerun.

Gist inlining reads `.gist-cache/<id>.json` (gitignored). Rebuild it with:

```sh
grep -oE 'gist\.github\.com\\?/[A-Za-z0-9_-]+\\?/[a-f0-9]+' exports/*.json exports/medium/*.json |
  grep -oE '[a-f0-9]{20,}$' | sort -u |
  while read -r id; do gh api "gists/$id" > ".gist-cache/$id.json"; done
```

## Medium import

The six stories Ghost never had (2019-02 and 2020-10, the `original_url: https://medium.com/@con.fotiadis/…` posts) came from Medium on 2026-09-04. Medium answers curl with a Cloudflare challenge, so each story was captured from Costa's logged-in Chrome (Claude in Chrome, `javascript_tool`): scroll to the bottom so the lazy images and gist iframes load, then POST to a throwaway local HTTP server a JSON of `{ id, url, title, subtitle, datePublished, dateModified (from the JSON-LD), tags, paragraphs (type/text/imageId/iframeTitle/mixtapeHref from window.__APOLLO_STATE__), domGists, html }`, where `html` is `article section` with the title, subtitle, author header, buttons, svgs, `<source>`s, srcsets and class names removed and each gist iframe replaced by `<script src="https://gist.github.com/CostaFot/<id>.js">` (the id is read from the iframe's `contentDocument`, which is same-origin; the Apollo model does not carry it). The captures are in `exports/medium/<medium_id>.json` (gitignored, on this machine only).

`node scripts/medium-import.js [--only-new]` turns them into `src/content/posts/YYYY-MM-DD-<slug>.md`: turndown with the same options as convert.js, gists inlined from `.gist-cache` through `scripts/lib/gist.js` with the gist title as the italic caption, Medium's `<pre>` blocks fenced with a guessed language, "mixtape" link cards as the same `> **[title](href)**` quote convert.js uses for Ghost bookmarks, the three-dot separator as `---`, tag chips, member banners and the floating "Human" badge dropped, `?source=` referrers stripped from every link, links to Costa's other stories rewritten to `/<slug>/` through `src/data/medium-claps.json`, the body's H3/H4 (Medium renders them as h2/h3) as `###`/`####`, and a story that opens with an image gets it as `feature_image`. Frontmatter: title, slug (`medium_slug`), dates from the JSON-LD, `tags: ["Android"]`, `excerpt` (the subtitle), `original_url` (the Medium URL), `popular: false`. Images stay as full-size `https://miro.medium.com/v2/<leaf>` URLs until `node scripts/localize-remote-images.js` pulls them into `src/images/YYYY/MM/1-<hash>.<ext>` (32 files on 2026-09-04, none failed). Hand fixes after the run that day: blank fence languages on the RxJava one-liners, a code-formatted link in the Flow post, and a GIPHY embed in Glide review (a 4 MB GIF loaded by a third-party script) dropped, the story links it in the text anyway. On 2026-09-04 the eleven code screenshots in RecyclerView in 2019 were transcribed into fenced blocks and the PNGs deleted (the sample repo they came from, `CostaFot/android--rx--project`, no longer exists, so they were read off the images), and the small square memes that opened Retrofit review and the StateFlow/SharedFlow post were replaced as heroes by wide 1998×1124 versions Costa supplied (`retrofit-review-hero.jpg`, `secret-bus-hero.jpg`); the old files stay under `src/images/`. On 2026-09-05 two captures turned out to have lost their opening (the HTML started after the first few paragraphs, while `paragraphs` still had them): Glide review got back its two intro sentences and the link card to `/retrofit-review/`, and its "not this guy again" meme, which follows them on Medium and so was never promoted, became the `feature_image`; Kotlin (over) Flow review got its lost opening meme back as `feature_image` (`src/images/2020/10/1-5xNHIsWfCNjSoCJpk6AcHQ.jpeg`, 519×481, fetched from miro by hand). Neither had a card image on the homepage before that. Rerunning the importer overwrites all of those edits; use `--only-new`.

The six stories' Medium clappers (76, 14, 11, 6, 6, 5 unique voters) were not imported into the claps API: Costa decided on 2026-09-04 that the posts start from zero beers, since they are kept off `/tag/popular/` anyway. `scripts/medium-claps-2.sql` (DO NOTHING inserts, the same shape as `scripts/medium-claps.sql`) stays in the repo unrun. Should that change, the runbook is: `DATABASE_PUBLIC_URL` of the Postgres service in the `claps-api` project (Railway's TCP proxy; psql timed out on most attempts on 2026-09-04, a retry loop got through); `curl -s 'https://claps-api-production.up.railway.app/top?limit=100' > scripts/medium-claps-2-before.json` first and check none of the six URLs are in it; then `for i in $(seq 1 30); do psql "$DATABASE_PUBLIC_URL" -v ON_ERROR_STOP=1 -f scripts/medium-claps-2.sql && break; sleep 3; done`; `/top` shows the six afterwards. The inserts are `ON CONFLICT DO NOTHING`, so a retry cannot double them. The counts in `src/data/medium-claps.json` are Medium's `voterCount` (unique clappers) and `clapCount`, read from Medium's GraphQL at `/_/graphql` while logged in on 2026-09-04; the old `?format=json` endpoint is gone.

Per-post SEO descriptions from Ghost's `posts_meta` are in the posts' `description` frontmatter (the converter emits it). Drafts and the Ghost code injection were deliberately left behind. The repo history was rewritten on 2026-09-02 to remove the exports before the repo went public; the pre-rewrite head is tagged `backup-before-history-rewrite-2130aa1` locally.

## Rules

- Never commit or push unless explicitly asked.
- Railway operations go through the `use-railway` skill and the Railway MCP.
