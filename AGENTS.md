# costafotiadis.com — agent guide

Source for costafotiadis.com: an Astro 5 static site, served by a dependency-free Node server on Railway. Content is Markdown under `src/content/`, images under `src/images/`.

## Status (as of 2026-09-02)

- **www.costafotiadis.com is served by this build on Railway** since 2026-09-02. Writing now happens in this repo; every push to `main` deploys.
- Ghost Pro is still subscribed as the rollback and has not been cancelled. Until it is, rollback is one Wix record (see the DNS section). Once it lapses, there is no rollback.
- Railway project `website`, service `website`, also reachable at the generated domain https://website-production-7020.up.railway.app. Deploys from `main` of `CostaFot/costafotiadis.com`.
- Umami only records hits from `www.costafotiadis.com`/`costafotiadis.com` (`data-domains` on the tag), so the generated Railway host stays out of the stats.
- stats.costafotiadis.com was folded in as `/stats/` on 2026-09-02 and its Wix CNAME and verify TXT deleted the same day (no redirect; only Costa used the subdomain). The `stats` Railway project (`2c7806df-fbe0-4f85-9808-c52d0851bc32`) is scheduled for deletion on Railway and may still show up in project listings until it goes. The collector and the `data` branch stay in `CostaFot/stats`; its old `site/`, `server.js` and `railway.json` were dropped the same day (commit b47175b there).
- `claps-api` CORS allows www, the bare apex, and the generated host (commit 3d5dd82 in `CostaFot/claps-api`, deployed 2026-09-02). Verify with `curl -H 'Origin: …' -I https://claps-api-production.up.railway.app/` and look at `access-control-allow-origin`.
- **The things feed was folded in as `/things/` on 2026-09-03** (entries, images, tags, capture script and the `/things` skill all live here now; see the Things section). things.costafotiadis.com was dropped without a redirect; the Wix CNAME was deleted on 2026-09-03. The `things` service and its volume in the `things-bot` project are scheduled for deletion on Railway (they may still appear in listings until then). Its Umami website was deleted and `CostaFot/things` archived on 2026-09-03 (its history is the old entry database). Videos come from a `media` volume on the `website` service.
- **Email subscriptions went live on 2026-09-04** through Buttondown: a footer form plus a drafts-only send workflow driven by an `email: true` frontmatter flag (see the Newsletter section). Two posts were flagged as the tests that day (interviews, Chrome extension) and both were sent.
- **The lab was folded in as `/lab/` on 2026-09-03** (nine client-side experiments, three of them on three.js; see the lab bullet under Invariants). lab.costafotiadis.com is dropped without a redirect; its Wix CNAME and Umami website were deleted and `CostaFot/lab` archived on 2026-09-03 (its history is the old source). The `lab` Railway project is scheduled for deletion and may show up in project listings until it goes. Nothing from the lab move is outstanding.

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
src/lib/elsewhere.ts    the /elsewhere/ list from elsewhere.md's frontmatter, post slugs checked, plus featuredIn(slug) for the post header
src/lib/lab.ts          EXPERIMENTS: globs src/pages/lab/*/index.astro for their `experiment` export, newest first
src/lib/markdown.ts     Markdown twins of the content: per-entry, /index.md, /llms.txt
src/lib/remark-rewrite-links.mjs   www.costafotiadis.com/<slug>/ -> /<slug>/ at build
src/layouts/Base.astro  head, theme script, header, footer, Umami, hit counter
src/layouts/Lab.astro   Base + post-style header for one experiment; the header alone is search-indexed
src/components/         PostList, PostCard, TagChips, ThemeToggle, Search (Pagefind), ShareBar, Claps, Projects, Elsewhere, Things + ThingsPage (the feed)
src/pages/              index, [slug] (posts AND pages), tag/[tag], rss.xml, 404, stats, things/ (index, tag/[tag]), lab/ (index + one folder per experiment), plus [slug].md, index.md, things.md, llms.txt
src/data/stats-apps.json   the extensions on /stats/ (slug, name, repo, storeId); one entry per app, the CI in CostaFot/stats has its own copy
src/data/things-tags.json  the things tag vocabulary (name -> one-line meaning); the build fails on a tag not in it
public/files/           downloads (the CV)
scripts/                Ghost migration tools (see below); scripts/things/ is the feed's capture script
scripts/newsletter.mjs  mails newly flagged posts through Buttondown; run by .github/workflows/newsletter.yml
skill/things/           the /things skill (symlinked from ~/.claude/skills/things)
media/                  gitignored local mirror of the Railway volume (videos)
exports/                gitignored; raw Ghost exports live in ~/Work/ghost-exports (they hold the admin user record, never commit them)
```

## Invariants — keep these true

- Posts and pages are served at `/<slug>/`, never `/blog/<slug>/` or `/posts/<slug>/`. `slug` in frontmatter is the Ghost URL path. `RESERVED` in `src/lib/site.ts` lists paths a slug may not use; the build fails on a collision. `things` is reserved for the feed; the post about it moved from `/things/` to `/building-things/` on 2026-09-03 (its old URL now shows the feed, which links to the post).
- Image paths in Markdown are relative (`../../images/YYYY/MM/name.ext`). Keep that layout; `server.js` also serves the originals at `/images/` and `/content/images/` so old hotlinks map 1:1.
- Internal links in content are site-relative (`/<slug>/`). Old absolute ones are rewritten at build by the remark plugin; do not add new absolute self-links.
- Gists stay inlined as fenced code blocks with an HTML comment naming the source. No gist script embeds.
- No JS is required to read the site. JS is used only for: theme toggle, search, share button, beer button, and the numbers and charts on `/stats/` (the page shell, app names and links are static). The newsletter form in the footer is plain HTML (see Newsletter).
- `/stats/` is `src/pages/stats.astro`: it fetches the per-app CSVs from the `data` branch of `CostaFot/stats` on raw.githubusercontent.com at page load (the daily GitHub Actions collector lives in that repo) and draws them with Chart.js bundled from npm, line pieces only. Series colours are page-local tokens; chart colours are read from the CSS tokens on every render, and the page re-renders when `data-theme` changes or the OS scheme flips.
- Every post and page has a Markdown twin at `/<slug>.md` (plus `/index.md`, `/things.md` and `/llms.txt`), generated from the raw body with image and internal links made absolute. Browsers get `<link rel="alternate" type="text/markdown">` and a "markdown" link in the footer; `curl`/`wget`/`httpie`/`xh`/`aria2` asking for `/` or `/<slug>/` get the twin unless they send `Accept: text/html`. Tag pages have no twin.
- The things feed (`/things/`, `/things/tag/<tag>/`, `/things.md`) is built from `src/content/things/*.json` by `src/components/ThingsPage.astro` + `Things.astro`. Permalinks are anchors (`/things/#<id>`). Tag filtering is static pages, not JS. Photos and previews go through Astro's image service, with the photo linking to the raw file under `/images/things/`; videos are `<video src="/media/<id>.mp4" poster="/media/<id>.jpg">` from the volume. Only the feed page carries `data-pagefind-body`, so search finds entries but tag pages are not indexed twice.
- The lab (`/lab/`, `/lab/<slug>/`) is static and client-side only: each experiment is `src/pages/lab/<slug>/index.astro`, exports `experiment = { title, description, date }`, wraps its markup in `src/layouts/Lab.astro` and does its work in a `<script>` (three.js is a dependency; Vite only ships it to the pages that import it). No Markdown twins, no API routes: an experiment that needs a server becomes its own Railway service, linked from the index. `/index.md` and `/llms.txt` list the experiments under `## Lab`. Use the global tokens (`--soft` for card backgrounds, `--mono` for HUD text).
- The footer shows the commit the site was built from, linking to it on GitHub, with `+` after the hash when a local build had uncommitted changes. The full sha is also in `<meta name="build">`. `src/lib/build.ts` reads `RAILWAY_GIT_COMMIT_SHA`/`RAILWAY_GIT_COMMIT_MESSAGE` and falls back to git.
- Design tokens live in `src/styles/global.css`. Code blocks are Night Owl in both themes.
- The Umami website id, claps API, and hit counter URLs live in `src/lib/site.ts`.

## Running

```sh
npm run dev        # astro dev (search shows a "build first" note; everything else works)
npm run build      # astro build + pagefind index -> dist/
npm start          # node server.js on $PORT (default 3000), serves dist/
```

Every push to `main` deploys on Railway. Never commit or push unless explicitly asked.

## Content

- Frontmatter: `title`, `slug`, `date_published`, `date_updated`, `tags`, `excerpt`, `feature_image`, `original_url`. Dates ISO 8601 UTC. `excerpt` is optional; the first paragraph is used otherwise. `email: true` mails the post (see Newsletter).
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
- Photos attached from the mobile app land in `~/.claude/uploads/<session>/`; `capture.js --file` copies them to `src/images/things/<id>.<ext>`. Link previews are downloaded into `src/images/things/previews/` (max 1 MB, else skipped). Never hotlink.
- Videos: `capture.js --type video --file` transcodes with ffmpeg to H.264/AAC mp4 with the index up front, extracts a poster, writes both to `media/<id>.*` (gitignored mirror) and uploads them to the volume. The upload needs the Railway CLI logged in with an SSH key registered. The volume is the only copy that matters: `git revert` of a video entry does not delete the file; `railway volume files delete` does, and only Costa can run it.

## Verify a change

1. `npm run build` passes and prints `Indexed 40 pages` (one per post/page, `/things/`, and one per lab experiment; bump when adding content). The chunk-size warning is three.js (one 500 kB chunk shared by drive, flyover and nebula); the `Duplicate id "projects"` glob-loader warning predates the lab and is harmless.
2. `node scripts/newsletter.mjs --dry-run --base HEAD~1 --head worktree` runs (usually printing `nothing to send`); with a post flagged on disk it prints that one email.
3. `npm start` (with `media/` holding the videos, or `MEDIA_DIR=…`), then curl: `/` 200, `/<slug>/` 200, `/elsewhere/` 200 and `/elsewhere.md` with the list under `## Newsletters`, `/<slug>` 301 to the slash form, `/tag/android/` 200, `/stats/` 200, `/adb-extension-stats/` 301 to `/stats/`, `/rss.xml` 200, `/content/images/2026/07/image.png` 200, `/things-feed/` 301 to `/things/`, `/nope/` 404. The lab: `/lab/` 200, `/lab` 301, `/lab/drive/` 200 (also for a plain `curl`, as HTML, since there is no twin), `/lab/nope/` 404. The feed: `/things/` 200, `/things/tag/life/` 200, `/images/things/20260902_171522.jpg` 200, `curl -sI -H 'Range: bytes=0-99' /media/20260827_234011.mp4` 206 with `Content-Range`. Then the Markdown side: `/<slug>.md`, `/things.md`, `/index.md` and `/llms.txt` 200 as `text/markdown`/`text/plain`; a plain `curl /<slug>/` returns Markdown with `cache-control: no-store`, while `curl -A Mozilla /<slug>/` and `curl -H 'Accept: text/html' /<slug>/` return HTML with the normal cache header.
4. Open it in a browser (terminal-browser or the Chrome MCP): both themes, phone width, search (`/` key), a post with Kotlin code, an animated GIF, the build line under the visitor counter, `/stats/` with live numbers and charts that redraw on the theme toggle, and `/things/` with a photo, a link preview, a playing video and the claude aside, and `/lab/` plus one three.js experiment (drive) and one 2d one (sandbox) animating and taking pointer input in both themes.
5. After a deploy, `curl -s https://www.costafotiadis.com/ -A Mozilla | grep 'name="build"'` must show the pushed sha; if it shows the previous one the CDN is still serving the old HTML.
6. Every path in the live sitemaps (`sitemap-posts.xml`, `sitemap-pages.xml` on www.costafotiadis.com) must exist as `dist/<path>/index.html` until Ghost is gone, or be in the `REDIRECTS` table in `server.js`. Retired so far: `/adb-extension-stats/` (2026-09-02) redirects to `/stats/`; `RETIRED_SLUGS` in `scripts/convert.js` keeps the converter from regenerating it.

## Next phases (in rough order)

1. **Finish the Ghost exit**: after a week or so on Railway, check Umami kept recording and the hit counter still increments, take a last Ghost export if anything changed there (drafts, scheduled posts, members), then cancel Ghost Pro. That is the point of no return for rollback.
2. **Keep `/elsewhere/` current**: built 2026-09-03 with Google's three Wear OS 7 / Live Updates posts that show the Just Eat app, the I/O 2026 slide, four Android Weekly issues and six jetc.dev issues (all verified that day; Android Weekly's author search and jetc.dev's archive were exhausted, Kotlin Weekly never linked a post). droidcon.com republished three posts in 2024–25 but those URLs are dead now, so they were left out. One talk, The Android Circuit (GDG London) on 2026-07-15, with a stage photo. New rows go in `src/content/pages/elsewhere.md`.
3. **Kotlin/Wasm or Compose-for-Web pages**: build the bundle elsewhere, commit the output under `public/<page>/`, mount from an Astro page. Astro does not care what produced the bundle.
4. **Apex on Railway (optional)**: the bare `costafotiadis.com` still goes through the Caddy redirector at `178.128.137.126`. If that box is retired, add the apex as a custom domain on the `website` service and use Wix's A/ALIAS option, since Wix cannot CNAME an apex.

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

**Rollback** is one record, while Ghost Pro is still subscribed: put the `www` CNAME back to `costas-blog-1.ghost.io`. The TXT record can stay. Once the subscription lapses this is no longer possible.

## Ghost migration tooling

`scripts/convert.js` turns the newest `exports/*.json` into `src/content/` (`exports/` is gitignored; copy the file in from `~/Work/ghost-exports/`). It overwrites files; use `--only-new` to add posts from a fresh export without touching hand-edited ones. `scripts/download-assets.js` mirrors Ghost-hosted assets into `src/images/` and `public/files/`. `scripts/localize-remote-images.js` pulls third-party-hosted images (Medium, Wix) into `src/images/` and rewrites the Markdown; safe to rerun.

Gist inlining reads `.gist-cache/<id>.json` (gitignored). Rebuild it with:

```sh
grep -oE 'gist\.github\.com\\?/[A-Za-z0-9_-]+\\?/[a-f0-9]+' exports/*.json |
  grep -oE '[a-f0-9]{20,}$' | sort -u |
  while read -r id; do gh api "gists/$id" > ".gist-cache/$id.json"; done
```

Per-post SEO descriptions from Ghost's `posts_meta` are in the posts' `description` frontmatter (the converter emits it). Drafts and the Ghost code injection were deliberately left behind. The repo history was rewritten on 2026-09-02 to remove the exports before the repo went public; the pre-rewrite head is tagged `backup-before-history-rewrite-2130aa1` locally.

## Rules

- Never commit or push unless explicitly asked.
- Railway operations go through the `use-railway` skill and the Railway MCP.
