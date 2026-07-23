# Blog archive

Markdown archive of [costafotiadis.com](https://www.costafotiadis.com) (Ghost), kept portable so the content can be reused on GitHub Pages or any other blog platform.

## Layout

- `content/posts/` — 25 posts as `YYYY-MM-DD-slug.md`, with YAML frontmatter (title, slug, dates, tags, excerpt, feature image, original URL)
- `content/pages/` — 4 pages (`me`, `resume`, `things-feed`, `adb-extension-stats`). The last two are small JS apps, so their HTML is kept verbatim under the frontmatter.
- `images/`, `files/` — every asset the posts reference, downloaded from the live site, mirroring Ghost's `/content/` paths. Markdown links point at these local copies.
- `exports/` — the raw Ghost export JSON (source of truth for regeneration)
- `scripts/` — the conversion tooling (see below)

GitHub gist embeds (the way Ghost posts carried code) are inlined as fenced code blocks, so posts render standalone without gist scripts. An HTML comment above each block records the source gist URL.

## Regenerating

```sh
npm install
npm run convert          # exports/*.json -> content/
npm run download-assets  # fetch referenced images/files from the live site
```

`convert` reads the newest `exports/*.json`. Gist embeds are inlined from `.gist-cache/` (one `gh api gists/<id>` response per file); to rebuild the cache:

```sh
grep -oE 'gist\.github\.com/[A-Za-z0-9_-]+/[a-f0-9]+\.js' exports/*.json |
  sed -E 's#.*/([a-f0-9]+)\.js#\1#' | sort -u |
  while read -r id; do gh api "gists/$id" > ".gist-cache/$id.json"; done
```

## Refreshing the archive

Export a new JSON from Ghost admin (Settings → Import/export), drop it in `exports/`, and rerun the two npm scripts.
