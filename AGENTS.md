# costafotiadis.com — agent guide

Source for costafotiadis.com: an Astro 5 static site, served by a dependency-free Node server on Railway. Content is Markdown under `src/content/`, images under `src/images/`.

## Status (as of 2026-09-02)

- **www.costafotiadis.com is served by this build on Railway** since 2026-09-02. Writing now happens in this repo; every push to `main` deploys.
- Ghost Pro is still subscribed as the rollback and has not been cancelled. Until it is, rollback is one Wix record (see the DNS section). Once it lapses, there is no rollback.
- Railway project `website`, service `website`, also reachable at the generated domain https://website-production-7020.up.railway.app. Deploys from `main` of `CostaFot/costafotiadis.com`.
- Umami only records hits from `www.costafotiadis.com`/`costafotiadis.com` (`data-domains` on the tag), so the generated Railway host stays out of the stats.
- `claps-api` CORS allows www, the bare apex, and the generated host (commit 3d5dd82 in `CostaFot/claps-api`, deployed 2026-09-02). Verify with `curl -H 'Origin: …' -I https://claps-api-production.up.railway.app/` and look at `access-control-allow-origin`.

## Railway

- Workspace "Costa Fotiadis's Projects" (`324b11f0-cca3-459d-97aa-fc7733e4cb2c`), project `website` (`a3f8e24b-b4f8-4a79-bec2-6202b9bd5b88`), environment `production` (`c72ba765-1567-45df-ad70-cf19668ba09d`), service `website` (`a7b99566-4178-4673-a9b7-9a33703cb232`).
- Source: GitHub `CostaFot/costafotiadis.com`, branch `main`. Builder Railpack, config in `railway.json`. No variables needed; `PORT` is injected.
- Domains: custom `www.costafotiadis.com` (id `c62ef3ea-70e4-457e-b9ed-6537b7a2bf6c`, CNAME target `xol7sq7i.up.railway.app`, Let's Encrypt cert issued 2026-09-02, auto-renews) and the generated https://website-production-7020.up.railway.app. DNS is on Wix — see the DNS section.
- Related projects in the same workspace: `analytics` (Umami + hit-counter), `claps-api`, `things-bot`, `lab`, `stats`, `clippy-leaderboard`.
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
src/content.config.ts   posts + pages collections (glob loader); `slug` frontmatter is the entry id
src/content/posts/      YYYY-MM-DD-slug.md
src/content/pages/      <slug>.md
src/images/YYYY/MM/     mirrors Ghost's /content/images/ layout; Astro optimises everything referenced from Markdown
src/lib/site.ts         site constants, nav, reserved paths, series detection, date/excerpt helpers
src/lib/build.ts        commit sha/message/date of this build (RAILWAY_GIT_* on Railway, git locally) for the footer
src/lib/markdown.ts     Markdown twins of the content: per-entry, /index.md, /llms.txt
src/lib/remark-rewrite-links.mjs   www.costafotiadis.com/<slug>/ -> /<slug>/ at build
src/layouts/Base.astro  head, theme script, header, footer, Umami, hit counter
src/components/         PostList, PostCard, TagChips, ThemeToggle, Search (Pagefind), ShareBar, Claps
src/pages/              index, [slug] (posts AND pages), tag/[tag], rss.xml, 404, plus [slug].md, index.md, llms.txt
public/files/           downloads (the CV)
scripts/                Ghost migration tools (see below)
exports/                gitignored; raw Ghost exports live in ~/Work/ghost-exports (they hold the admin user record, never commit them)
```

## Invariants — keep these true

- Posts and pages are served at `/<slug>/`, never `/blog/<slug>/` or `/posts/<slug>/`. `slug` in frontmatter is the Ghost URL path. `RESERVED` in `src/lib/site.ts` lists paths a slug may not use; the build fails on a collision. `things` is deliberately not reserved: the post about the feed lives at `/things/`.
- Image paths in Markdown are relative (`../../images/YYYY/MM/name.ext`). Keep that layout; `server.js` also serves the originals at `/images/` and `/content/images/` so old hotlinks map 1:1.
- Internal links in content are site-relative (`/<slug>/`). Old absolute ones are rewritten at build by the remark plugin; do not add new absolute self-links.
- Gists stay inlined as fenced code blocks with an HTML comment naming the source. No gist script embeds.
- No JS is required to read the site. JS is used only for: theme toggle, search, share button, beer button.
- Every post and page has a Markdown twin at `/<slug>.md` (plus `/index.md` and `/llms.txt`), generated from the raw body with image and internal links made absolute. Browsers get `<link rel="alternate" type="text/markdown">` and a "markdown" link in the footer; `curl`/`wget`/`httpie`/`xh`/`aria2` asking for `/` or `/<slug>/` get the twin unless they send `Accept: text/html`. Tag pages have no twin.
- The footer shows the commit the site was built from, linking to it on GitHub, with `+` after the hash when a local build had uncommitted changes. The full sha is also in `<meta name="build">`. `src/lib/build.ts` reads `RAILWAY_GIT_COMMIT_SHA`/`RAILWAY_GIT_COMMIT_MESSAGE` and falls back to git.
- Design tokens in `src/styles/global.css` are shared with `CostaFot/things`. Change them in both or not at all. Code blocks are Night Owl in both themes.
- The Umami website id, claps API, and hit counter URLs live in `src/lib/site.ts`.

## Running

```sh
npm run dev        # astro dev (search shows a "build first" note; everything else works)
npm run build      # astro build + pagefind index -> dist/
npm start          # node server.js on $PORT (default 3000), serves dist/
```

Every push to `main` deploys on Railway. Never commit or push unless explicitly asked.

## Content

- Frontmatter: `title`, `slug`, `date_published`, `date_updated`, `tags`, `excerpt`, `feature_image`, `original_url`. Dates ISO 8601 UTC. `excerpt` is optional; the first paragraph is used otherwise.
- Series are detected from the title prefix (`Exercises in futility:`, `At the mountains of madness:`, `Android Shorts 🩳:`, `It looks like you're trying to:`) and rendered as an eyebrow + headline. Extend `SERIES` in `src/lib/site.ts` for a new one.
- `/projects/`: the Markdown body of `src/content/pages/projects.md` is the JET section; everything under it comes from the `groups` array in its frontmatter (one rail stamp per group, cards with `title`, `blurb`, optional `image`/`alt`/`wide`, and `links`, first link is the card's target). Rendered by `src/components/Projects.astro`; blurbs allow backticks and `[text](href)` only. Cards without an image render as full-width text rows, so order image cards in pairs (or `wide`) to keep the two-up grid closed. Screenshots for it live in `src/images/2026/09/` and were lifted from the repos' READMEs and listing folders, plus headless-Brave shots of the live sites (`brave --headless=new --window-size=1120,630 --force-dark-mode --virtual-time-budget=10000 --screenshot=…`).
- Videos: put the file on the Railway volume (served from `/media/<name>.mp4` with Range support) and write `<video controls playsinline src="/media/<name>.mp4"></video>` in the Markdown. Not wired to a volume yet.
- Writing in Costa's voice (posts, README) goes through the `costa-writing-style` skill.

## Verify a change

1. `npm run build` passes and prints `Indexed 29 pages` (one per post/page; bump when adding content).
2. `npm start`, then curl: `/` 200, `/<slug>/` 200, `/<slug>` 301 to the slash form, `/tag/android/` 200, `/rss.xml` 200, `/content/images/2026/07/image.png` 200, `/things-feed/` 301, `/nope/` 404. Then the Markdown side: `/<slug>.md`, `/index.md` and `/llms.txt` 200 as `text/markdown`/`text/plain`; a plain `curl /<slug>/` returns Markdown with `cache-control: no-store`, while `curl -A Mozilla /<slug>/` and `curl -H 'Accept: text/html' /<slug>/` return HTML with the normal cache header.
3. Open it in a browser (terminal-browser or the Chrome MCP): both themes, phone width, search (`/` key), a post with Kotlin code, an animated GIF, the build line under the visitor counter.
4. After a deploy, `curl -s https://www.costafotiadis.com/ -A Mozilla | grep 'name="build"'` must show the pushed sha; if it shows the previous one the CDN is still serving the old HTML.
5. Every path in the live sitemaps (`sitemap-posts.xml`, `sitemap-pages.xml` on www.costafotiadis.com) must exist as `dist/<path>/index.html` until Ghost is gone, or be in the `REDIRECTS` table in `server.js`. Retired so far: `/adb-extension-stats/` (2026-09-02) redirects to the command-palette post; `RETIRED_SLUGS` in `scripts/convert.js` keeps the converter from regenerating it.

## Next phases (in rough order)

1. **Finish the Ghost exit**: after a week or so on Railway, check Umami kept recording and the hit counter still increments, take a last Ghost export if anything changed there (drafts, scheduled posts, members), then cancel Ghost Pro. That is the point of no return for rollback.
2. **Fold things in**: build `/things/…` from `~/Work/things/entries/*.json` (see its AGENTS.md for the entry schema and the voice rule). `/things/` itself is taken by a post; pick another path (e.g. `/feed/`) or move the post. Videos need the Railway volume mounted on this service and served from `/media/` (server.js already does Range requests). Then redirect things.costafotiadis.com here and reuse its Umami website id or retire it.
3. **Fold lab in**: it is Astro 5 SSR with three.js; pages can be copied under `src/pages/lab/`. If any of them need SSR, switch this site to `output: 'static'` + per-page `prerender = false` with `@astrojs/node`, and change `railway.json` start command accordingly.
4. **Fold stats in**: `~/Work/stats/site` is static HTML + JS, plus a small `server.js`; move under `public/stats/` or an Astro page, nav link becomes `/stats/`. Then repoint the `/adb-extension-stats/` redirect in `server.js` from the command-palette post to `/stats/` (it was the ADB extension's Chart.js dashboard; the post is only a stopgap target).
5. **Mentions page**: a page listing where the posts got featured (Android Weekly issues, Kotlin Weekly, newsletters, podcasts, talks). Probably `src/content/pages/mentions.md` with the list in frontmatter (post slug, outlet, issue/number, date, link), rendered like `/projects/` does its `groups`, and a "featured in" line on the post itself. Needs the list compiled first; the Android Weekly archive is searchable by URL.
6. **Kotlin/Wasm or Compose-for-Web pages**: build the bundle elsewhere, commit the output under `public/<page>/`, mount from an Astro page. Astro does not care what produced the bundle.
7. **Apex on Railway (optional)**: the bare `costafotiadis.com` still goes through the Caddy redirector at `178.128.137.126`. If that box is retired, add the apex as a custom domain on the `website` service and use Wix's A/ALIAS option, since Wix cannot CNAME an apex.

Theme work, if it comes up again: tokens in `src/styles/global.css`, feed in `PostList`/`PostCard`, article in `src/pages/[slug].astro`.

## DNS — the domain is on Wix

Nameservers are `ns8.wixdns.net` / `ns9.wixdns.net`, so **every record is edited in the Wix dashboard** (Domains → costafotiadis.com → DNS records). There is no Cloudflare, no registrar API in play, and no MCP for it: Costa makes these changes by hand. Wix's editor is also the reason the other subdomains are plain CNAMEs.

Live records as of 2026-09-02 (after the cutover edit):

| Name | Type | Value | What it is |
|---|---|---|---|
| `costafotiadis.com` | A | `178.128.137.126` | redirector (Caddy) → `https://www.costafotiadis.com/` |
| `www` | CNAME | `xol7sq7i.up.railway.app` | Railway `website` service (was `costas-blog-1.ghost.io`, Ghost Pro, until 2026-09-02) |
| `things` | CNAME | `xssqfss8.up.railway.app` | Railway |
| `graveyard` | CNAME | `1mkedneh.up.railway.app` | Railway |
| `lab` | CNAME | `76gzlc3v.up.railway.app` | Railway |
| `stats` | CNAME | `cl3x70wd.up.railway.app` | Railway |
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
