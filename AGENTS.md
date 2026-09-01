# costafotiadis.com — agent guide

Source for costafotiadis.com: an Astro 5 static site, served by a dependency-free Node server on Railway. Content is Markdown under `src/content/`, images under `src/images/`.

## Status (as of 2026-09-02)

- Live site still runs on Ghost Pro at www.costafotiadis.com. Ghost remains the writing surface until the domain moves.
- This build is previewed on Railway: project `website`, service `website`, domain https://website-production-7020.up.railway.app (deploys from `main` of `CostaFot/costafotiadis.com`). The custom domain moves only when Costa says he is happy with it.
- Umami only records hits from `www.costafotiadis.com`/`costafotiadis.com` (`data-domains` on the tag), so the preview host stays out of the stats.
- `claps-api` CORS only allows `https://www.costafotiadis.com`; the beer button shows counts but cannot fetch on the preview host until that origin is added in `CostaFot/claps-api` (`app.py`).
- Deployed 2026-09-02 from commit e32d1c6. Every push to `main` deploys; the preview came up first try.

## Railway

- Workspace "Costa Fotiadis's Projects" (`324b11f0-cca3-459d-97aa-fc7733e4cb2c`), project `website` (`a3f8e24b-b4f8-4a79-bec2-6202b9bd5b88`), environment `production` (`c72ba765-1567-45df-ad70-cf19668ba09d`), service `website` (`a7b99566-4178-4673-a9b7-9a33703cb232`).
- Source: GitHub `CostaFot/costafotiadis.com`, branch `main`. Builder Railpack, config in `railway.json`. No variables needed; `PORT` is injected.
- Domain: https://website-production-7020.up.railway.app (generated). No custom domain yet; www.costafotiadis.com still points at Ghost. DNS is on Wix — see the DNS section.
- Related projects in the same workspace: `analytics` (Umami + hit-counter), `claps-api`, `things-bot`, `lab`, `stats`, `clippy-leaderboard`.
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
src/lib/remark-rewrite-links.mjs   www.costafotiadis.com/<slug>/ -> /<slug>/ at build
src/layouts/Base.astro  head, theme script, header, footer, Umami, hit counter
src/components/         PostList, PostCard, TagChips, ThemeToggle, Search (Pagefind), ShareBar, Claps
src/pages/              index, [slug] (posts AND pages), tag/[tag], rss.xml, 404
public/files/           downloads (the CV)
scripts/                Ghost migration tools (see below)
exports/                raw Ghost exports; keep until drafts and posts_meta are extracted
```

## Invariants — keep these true

- Posts and pages are served at `/<slug>/`, never `/blog/<slug>/` or `/posts/<slug>/`. `slug` in frontmatter is the Ghost URL path. `RESERVED` in `src/lib/site.ts` lists paths a slug may not use; the build fails on a collision. `things` is deliberately not reserved: the post about the feed lives at `/things/`.
- Image paths in Markdown are relative (`../../images/YYYY/MM/name.ext`). Keep that layout; `server.js` also serves the originals at `/images/` and `/content/images/` so old hotlinks map 1:1.
- Internal links in content are site-relative (`/<slug>/`). Old absolute ones are rewritten at build by the remark plugin; do not add new absolute self-links.
- Gists stay inlined as fenced code blocks with an HTML comment naming the source. No gist script embeds.
- No JS is required to read the site. JS is used only for: theme toggle, search, share button, beer button.
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
- Videos: put the file on the Railway volume (served from `/media/<name>.mp4` with Range support) and write `<video controls playsinline src="/media/<name>.mp4"></video>` in the Markdown. Not wired to a volume yet.
- Writing in Costa's voice (posts, README) goes through the `costa-writing-style` skill.

## Verify a change

1. `npm run build` passes and prints `Indexed 29 pages` (one per post/page; bump when adding content).
2. `npm start`, then curl: `/` 200, `/<slug>/` 200, `/<slug>` 301 to the slash form, `/tag/android/` 200, `/rss.xml` 200, `/content/images/2026/07/image.png` 200, `/things-feed/` 301, `/nope/` 404.
3. Open it in a browser (terminal-browser or the Chrome MCP): both themes, phone width, search (`/` key), a post with Kotlin code, an animated GIF.
4. Every path in the live sitemaps (`sitemap-posts.xml`, `sitemap-pages.xml` on www.costafotiadis.com) must exist as `dist/<path>/index.html` until Ghost is gone, or be in the `REDIRECTS` table in `server.js`. Retired so far: `/adb-extension-stats/` (2026-09-02) redirects to the command-palette post; `RETIRED_SLUGS` in `scripts/convert.js` keeps the converter from regenerating it.

## Next phases (in rough order)

1. **claps-api CORS**: add the preview origin (and later bare `costafotiadis.com`) to `CORS(app, origins=[...])` in `~/Work/claps-api/app.py`. Until then the beer button shows counts only from localStorage on the preview host.
2. **Iterate on the theme** until Costa is happy. Tokens in `src/styles/global.css`; feed in `PostList`/`PostCard`; article in `src/pages/[slug].astro`.
3. **Fold things in**: build `/things/…` from `~/Work/things/entries/*.json` (see its AGENTS.md for the entry schema and the voice rule). `/things/` itself is taken by a post; pick another path (e.g. `/feed/`) or move the post. Videos need the Railway volume mounted on this service and served from `/media/` (server.js already does Range requests). Then redirect things.costafotiadis.com here and reuse its Umami website id or retire it.
4. **Fold lab in**: it is Astro 5 SSR with three.js; pages can be copied under `src/pages/lab/`. If any of them need SSR, switch this site to `output: 'static'` + per-page `prerender = false` with `@astrojs/node`, and change `railway.json` start command accordingly.
5. **Fold stats in**: `~/Work/stats/site` is static HTML + JS, plus a small `server.js`; move under `public/stats/` or an Astro page, nav link becomes `/stats/`. Then repoint the `/adb-extension-stats/` redirect in `server.js` from the command-palette post to `/stats/` (it was the ADB extension's Chart.js dashboard; the post is only a stopgap target).
6. **Kotlin/Wasm or Compose-for-Web pages**: build the bundle elsewhere, commit the output under `public/<page>/`, mount from an Astro page. Astro does not care what produced the bundle.
7. **Domain move** — see the DNS section below. Before deleting `exports/`, extract the `things-feed` draft and `posts_meta`.

## DNS — the domain is on Wix

Nameservers are `ns8.wixdns.net` / `ns9.wixdns.net`, so **every record is edited in the Wix dashboard** (Domains → costafotiadis.com → DNS records). There is no Cloudflare, no registrar API in play, and no MCP for it: Costa makes these changes by hand. Wix's editor is also the reason the other subdomains are plain CNAMEs.

Live records as of 2026-09-02:

| Name | Type | Value | What it is |
|---|---|---|---|
| `costafotiadis.com` | A | `178.128.137.126` | redirector (Caddy) → `https://www.costafotiadis.com/` |
| `www` | CNAME | `costas-blog-1.ghost.io` | **Ghost Pro — this is the one that moves** |
| `things` | CNAME | `xssqfss8.up.railway.app` | Railway |
| `lab` | CNAME | `76gzlc3v.up.railway.app` | Railway |
| `stats` | CNAME | `cl3x70wd.up.railway.app` | Railway |
| `costafotiadis.com` | TXT | `google-site-verification=…` | leave alone |

No MX records, so **nothing here touches email** — but re-check before changing the apex, in case mail gets added later.

### Cutover, when Costa says he is happy

1. Drop the `www` CNAME TTL in Wix to the minimum a day ahead, so a rollback is fast.
2. On the Railway `website` service, add the custom domain `www.costafotiadis.com` (`generate-domain` with `domain`), and the apex `costafotiadis.com` if the redirector is being retired. Railway returns the exact CNAME target — use that, not the value in the table above.
3. In Wix, point `www` at the Railway target. Wix cannot CNAME an apex; if the apex should serve Railway directly, use Wix's A/ALIAS option or keep the existing redirector pointing at `www`. Keeping the redirector is the smaller change.
4. Wait for Railway to issue the certificate (`domain-status`), then verify over the real hostname: homepage, a post, `/rss.xml`, `/content/images/…`, and a 404.
5. Update `CORS(app, origins=[...])` in `~/Work/claps-api/app.py` if the origin list changes (bare apex, or the preview host is dropped).
6. Check Umami starts recording the real domain (`data-domains` in `src/lib/site.ts` already allows both forms), and that the hit counter still increments.
7. Only then cancel Ghost Pro. Keep the Ghost export until the site has run on the real domain for a while — `www` cannot be pointed back once the subscription lapses.

Rollback at any point is one record: put the `www` CNAME back to `costas-blog-1.ghost.io`.

## Ghost migration tooling

`scripts/convert.js` turns the newest `exports/*.json` into `src/content/`. It overwrites files; use `--only-new` to add posts from a fresh export without touching hand-edited ones. `scripts/download-assets.js` mirrors Ghost-hosted assets into `src/images/` and `public/files/`. `scripts/localize-remote-images.js` pulls third-party-hosted images (Medium, Wix) into `src/images/` and rewrites the Markdown; safe to rerun.

Gist inlining reads `.gist-cache/<id>.json` (gitignored). Rebuild it with:

```sh
grep -oE 'gist\.github\.com\\?/[A-Za-z0-9_-]+\\?/[a-f0-9]+' exports/*.json |
  grep -oE '[a-f0-9]{20,}$' | sort -u |
  while read -r id; do gh api "gists/$id" > ".gist-cache/$id.json"; done
```

Still only in `exports/`, not in `src/content/`: the draft `things-feed` page, per-post SEO overrides (`posts_meta`), and the original Ghost code injection. Extract what is wanted before deleting `exports/`.

## Rules

- Never commit or push unless explicitly asked.
- Railway operations go through the `use-railway` skill and the Railway MCP.
