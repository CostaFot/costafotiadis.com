# costafotiadis.com

The source for [costafotiadis.com](https://www.costafotiadis.com). Posts are Markdown, the site is [Astro](https://astro.build), and it runs on Railway behind a Node server that is small enough to read in one sitting.

It used to be a Ghost blog. The export lives in `exports/` for now, converted into `src/content/` once, and never again (lie, there is a `--only-new` flag).

## Run it

```sh
npm install
npm run dev      # http://localhost:4321
npm run build    # dist/ + search index
npm start        # serve dist/ the way Railway does
```

## Where things are

- `src/content/posts/` — one Markdown file per post, `YYYY-MM-DD-slug.md`. The slug is the URL.
- `src/content/pages/` — Me, Projects, Resume, and the ADB dashboard.
- `src/images/` — everything the posts reference. Astro resizes the 5 MB screenshots so you don't have to.
- `public/files/` — the CV.

## What it does

Light and dark mode (follows the system, or hit the toggle), search that works without a server, RSS, the beer button, and the visitor counter. No comments, no newsletter, no cookies. Later.
