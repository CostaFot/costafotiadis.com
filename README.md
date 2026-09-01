# costafotiadis.com

Source for [costafotiadis.com](https://www.costafotiadis.com). The site is moving off Ghost Pro and will be self-hosted on Railway; this repo is where the content lives now and where the site itself will be built from.

## Layout

- `content/posts/` — every post as `YYYY-MM-DD-slug.md`, with YAML frontmatter (title, slug, dates, tags, excerpt, feature image, original URL)
- `content/pages/` — `me`, `resume`, `projects`, `adb-extension-stats`. The last one is a small JS app, so its HTML is kept verbatim under the frontmatter.
- `images/`, `files/` — every asset the posts reference, mirroring Ghost's `/content/` paths. Markdown links point at these local copies.
- `exports/` — the raw Ghost export JSON the content was generated from
- `scripts/` — the Ghost-to-Markdown conversion tooling

Code embeds that were GitHub gists on Ghost are inlined as fenced code blocks, with an HTML comment above each recording the source gist.

## Pulling a fresh export from Ghost

Until the domain moves, Ghost stays the place where posts get written. To sync:

```sh
npm install
npm run convert          # exports/*.json -> content/
npm run download-assets  # fetch referenced images/files from the live site
```

`convert` reads the newest `exports/*.json`. Export a new one from Ghost admin (Settings → Import/export) and drop it in `exports/` first. Gist cache rebuild and other details are in `CLAUDE.md`.
