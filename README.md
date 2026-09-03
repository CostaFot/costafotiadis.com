Source for [costafotiadis.com](https://www.costafotiadis.com). 

* Markdown
* [Astro](https://astro.build) 
* Runs on Railway behind a Node server

## Run it

```sh
npm install
npm run dev      # http://localhost:4321
npm run build    # dist/ + search index
npm start        # serve dist/ the way Railway does
```

## Where things are

- `src/content/posts/` — one Markdown file per post, `YYYY-MM-DD-slug.md`. The slug is the URL.
- `src/content/pages/` — Me, Projects, Resume.
- `src/images/` — everything the posts reference. Astro resizes the 5 MB screenshots so you don't have to.
- `public/files/` — the CV.

## What it does

Lots of blabbing. Also:
* Light and dark mode 
* Search that works without a server
* RSS
* The beer button
* The visitor counter
* A lab of small web toys at `/lab/`
