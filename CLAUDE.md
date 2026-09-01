# costafotiadis.com

This repo is the official source for costafotiadis.com. Content is Markdown under `content/`; assets under `images/` and `files/`.

## Status of the migration (as of 2026-09-02)

- Live site still runs on Ghost Pro at www.costafotiadis.com. Ghost remains the writing surface until the domain is moved.
- Goal: self-host on Railway, built from this repo. Static site generator and theme are not chosen yet.
- The Railway workspace already hosts related projects: `analytics` (Umami), `things-bot` (things.costafotiadis.com), `claps-api`. The website will be a new project alongside them.

## Content conventions

- Posts: `content/posts/YYYY-MM-DD-slug.md`. Frontmatter keys: `title`, `slug`, `date_published`, `date_updated`, `tags`, `excerpt`, `feature_image`, `original_url`. Dates are ISO 8601 UTC as Ghost exported them.
- Pages: `content/pages/<slug>.md`, same frontmatter minus tags/excerpt. `adb-extension-stats.md` keeps raw HTML under the frontmatter because it is a small JS app.
- `slug` must match the Ghost URL path so existing links keep working after the move: `https://www.costafotiadis.com/<slug>/`. Any site build must serve posts and pages at `/<slug>/`, not `/posts/<slug>/`.
- Image paths in Markdown are relative (`../../images/YYYY/MM/name.ext`) and mirror Ghost's `/content/images/` layout. Keep that layout so old hotlinks can be redirected 1:1.
- Gist embeds are inlined as fenced code blocks. An HTML comment `<!-- gist: <url> -->` above each block records the source. Do not re-introduce gist script embeds.

## Regeneration tooling

`scripts/convert.js` turns the newest `exports/*.json` into `content/` using turndown + the GFM plugin. `scripts/download-assets.js` fetches every referenced asset from the live site into `images/` and `files/`. Both are one-off migration tools; once Ghost is gone they stop being needed and can be removed along with `exports/`.

Gist inlining reads `.gist-cache/<id>.json` (gitignored). Rebuild it with:

```sh
grep -oE 'gist\.github\.com\\?/[A-Za-z0-9_-]+\\?/[a-f0-9]+' exports/*.json |
  grep -oE '[a-f0-9]{20,}$' | sort -u |
  while read -r id; do gh api "gists/$id" > ".gist-cache/$id.json"; done
```

`convert` overwrites `content/` wholesale. If posts have been edited by hand in this repo, do not rerun it without diffing.

## Rules

- Never commit or push unless explicitly asked.
- Writing in Costa's voice (posts, README) goes through the `costa-writing-style` skill.
- Railway operations go through the `use-railway` skill and the Railway MCP.
