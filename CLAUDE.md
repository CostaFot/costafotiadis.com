# costafotiadis.com

Source for costafotiadis.com: an Astro 5 static site, served by a dependency-free Node server on Railway. Content is Markdown under `src/content/`, images under `src/images/`.

## Status (as of 2026-09-02)

- Live site still runs on Ghost Pro at www.costafotiadis.com. Ghost remains the writing surface until the domain moves.
- This build is previewed on Railway: project `website`, service `website`, domain https://website-production-7020.up.railway.app (deploys from `main` of `CostaFot/costafotiadis.com`). The custom domain moves only when Costa says he is happy with it.
- Umami only records hits from `www.costafotiadis.com`/`costafotiadis.com` (`data-domains` on the tag), so the preview host stays out of the stats.
- `claps-api` CORS only allows `https://www.costafotiadis.com`; the beer button shows counts but cannot fetch on the preview host until that origin is added in `CostaFot/claps-api` (`app.py`).
- Later phases: fold things.costafotiadis.com, lab, stats into this site; Kotlin/Wasm pages under `public/`; videos on a Railway volume at `/media/`; domain move; cancel Ghost.

## Layout

```
astro.config.mjs        site URL is always https://www.costafotiadis.com (canonical), static output, trailing slashes
server.js               serves dist/, plus /images + /content/images -> src/images, /files -> public/files, /media -> volume; 301 table
railway.json            RAILPACK, `npm run build`, `node server.js`
src/content.config.ts   posts + pages collections (glob loader); `slug` frontmatter is the entry id
src/content/posts/      YYYY-MM-DD-slug.md
src/content/pages/      <slug>.md  (adb-extension-stats.md is raw HTML under frontmatter: a small Chart.js app)
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

## Ghost migration tooling

`scripts/convert.js` turns the newest `exports/*.json` into `src/content/`. It overwrites files; use `--only-new` to add posts from a fresh export without touching hand-edited ones. `scripts/download-assets.js` mirrors Ghost-hosted assets into `src/images/` and `public/files/`. `scripts/localize-remote-images.js` pulls third-party-hosted images (Medium, Wix) into `src/images/` and rewrites the Markdown; safe to rerun.

Gist inlining reads `.gist-cache/<id>.json` (gitignored). Rebuild it with:

```sh
grep -oE 'gist\.github\.com\\?/[A-Za-z0-9_-]+\\?/[a-f0-9]+' exports/*.json |
  grep -oE '[a-f0-9]{20,}$' | sort -u |
  while read -r id; do gh api "gists/$id" > ".gist-cache/$id.json"; done
```

Still only in `exports/`, not in `src/content/`: one draft post (`fighting-ai-slop-with-anti-slop`), the draft `things-feed` page, per-post SEO overrides (`posts_meta`), and the original Ghost code injection. Extract what is wanted before deleting `exports/`.

## Rules

- Never commit or push unless explicitly asked.
- Railway operations go through the `use-railway` skill and the Railway MCP.
