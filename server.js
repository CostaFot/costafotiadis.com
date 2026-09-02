// Dependency-free static server for the Astro build in ./dist.
// Adapted from CostaFot/things (itself from CostaFot/stats).
//
// Besides dist/ it serves:
//   /images/*, /content/images/*  -> src/images/   (raw originals; Ghost hotlinks map 1:1)
//   /files/*,  /content/files/*   -> public/files/
//   /media/*                      -> Railway volume (videos; too big for git), with Range support
// and a small table of permanent redirects for URLs Ghost used to answer.
//
// Terminal clients (curl, wget, httpie, xh) asking for an HTML URL get the
// page's Markdown twin instead (dist/<slug>.md, built by src/pages/[slug].md.ts),
// unless they ask for text/html explicitly. Those responses are never cached:
// Railway's CDN keys on the URL only, so a cached Markdown body would be
// served to browsers. The edge rule in AGENTS.md keeps such requests off the
// cache altogether; without it a terminal client can get the cached HTML.
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "dist");
const IMAGES = path.resolve(__dirname, "src", "images");
const FILES = path.resolve(__dirname, "public", "files");
const MEDIA = path.resolve(
  process.env.MEDIA_DIR ||
    (process.env.RAILWAY_VOLUME_MOUNT_PATH ? path.join(process.env.RAILWAY_VOLUME_MOUNT_PATH, "media") : path.join(__dirname, "media")),
);
const PORT = process.env.PORT || 3000;

const REDIRECTS = {
  "/things-feed/": "https://things.costafotiadis.com/",
  "/things-feed": "https://things.costafotiadis.com/",
  "/rss/": "/rss.xml",
  "/rss": "/rss.xml",
  "/feed/": "/rss.xml",
  "/sitemap.xml": "/sitemap-index.xml",
  // Retired 2026-09-02; the Chart.js dashboard for the extension is gone, send old links to the post.
  "/adb-extension-stats/": "/it-looks-like-youre-trying-to-build-an-extension-for-command-palette/",
  "/adb-extension-stats": "/it-looks-like-youre-trying-to-build-an-extension-for-command-palette/",
};

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".pdf": "application/pdf",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mov": "video/quicktime",
  ".wasm": "application/wasm",
  ".pf_meta": "application/octet-stream",
  ".pf_index": "application/octet-stream",
  ".pf_fragment": "application/octet-stream",
};

function cacheControl(rel, ext) {
  // Browsers always revalidate HTML; Railway's CDN keeps it for an hour and serves
  // stale for a day while refetching. Every deploy purges cached HTML anyway.
  if (ext === ".html" || ext === ".xml" || ext === ".txt" || ext === ".md") return "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400";
  if (rel.startsWith("_astro/") || rel.startsWith("images/") || rel.startsWith("media/")) return "public, max-age=31536000, immutable";
  if (rel.startsWith("pagefind/")) return "public, max-age=3600";
  return "public, max-age=300";
}

function contentType(file) {
  const ext = path.extname(file).toLowerCase();
  if (ext === ".xml" && /rss\.xml$/.test(file)) return "application/rss+xml; charset=utf-8";
  return TYPES[ext] || "application/octet-stream";
}

const TERMINAL_UA = /^(curl|wget|httpie|xh|aria2|lwp-request)\b/i;

// True when the client is a terminal tool that did not ask for HTML.
function wantsMarkdown(req) {
  if (!TERMINAL_UA.test(req.headers["user-agent"] || "")) return false;
  return !/text\/html/i.test(req.headers.accept || "");
}

// dist/index.html -> dist/index.md, dist/<slug>/index.html -> dist/<slug>.md
function markdownTwin(rel) {
  if (rel === "index.html") return path.join(ROOT, "index.md");
  const m = /^([^/]+)\/index\.html$/.exec(rel);
  return m ? path.join(ROOT, `${m[1]}.md`) : null;
}

// Streams a file with HTTP Range support so <video> can seek.
function stream(req, res, file, rel, extraHeaders = {}) {
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) return notFound(res);
    const headers = {
      "Content-Type": contentType(file),
      "Cache-Control": cacheControl(rel, path.extname(file).toLowerCase()),
      "Accept-Ranges": "bytes",
      ...extraHeaders,
    };
    let start = 0, end = st.size - 1, status = 200;
    const m = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range || "");
    if (m && (m[1] || m[2])) {
      if (m[1]) { start = Number(m[1]); if (m[2]) end = Math.min(Number(m[2]), end); }
      else { start = Math.max(st.size - Number(m[2]), 0); }
      if (start > end || start >= st.size) {
        res.writeHead(416, { "Content-Range": `bytes */${st.size}` }).end();
        return;
      }
      status = 206;
      headers["Content-Range"] = `bytes ${start}-${end}/${st.size}`;
    }
    headers["Content-Length"] = end - start + 1;
    res.writeHead(status, headers);
    if (req.method === "HEAD") { res.end(); return; }
    fs.createReadStream(file, { start, end }).on("error", () => res.destroy()).pipe(res);
  });
}

function notFound(res) {
  fs.readFile(path.join(ROOT, "404.html"), (err, data) => {
    res.writeHead(404, { "Content-Type": err ? "text/plain" : TYPES[".html"], "Cache-Control": "no-cache" });
    res.end(err ? "Not found" : data);
  });
}

// Resolve a request path to a file under one of the mounts, or null.
function resolve(rel) {
  const mounts = [
    [/^content\/images\//, IMAGES], [/^images\//, IMAGES],
    [/^content\/files\//, FILES], [/^files\//, FILES],
    [/^media\//, MEDIA],
  ];
  for (const [re, base] of mounts) {
    if (!re.test(rel)) continue;
    const file = path.resolve(base, rel.replace(re, ""));
    return file.startsWith(base + path.sep) ? file : null;
  }
  const file = path.resolve(ROOT, rel);
  return file.startsWith(ROOT + path.sep) ? file : null;
}

http
  .createServer((req, res) => {
    let url;
    try { url = new URL(req.url, "http://x"); } catch { res.writeHead(400).end("Bad request"); return; }
    let pathname;
    try { pathname = decodeURIComponent(url.pathname); } catch { res.writeHead(400).end("Bad request"); return; }

    if (REDIRECTS[pathname]) {
      res.writeHead(301, { Location: REDIRECTS[pathname] }).end();
      return;
    }

    let rel = pathname === "/" ? "index.html" : pathname.slice(1);
    // Astro's build.format "directory": /<slug>/ -> /<slug>/index.html.
    // A bare /<slug> gets a permanent redirect to the trailing-slash form,
    // which is what Ghost served and what every old link points at.
    if (rel.endsWith("/")) rel += "index.html";
    let file = resolve(rel);
    if (!file) { res.writeHead(403).end("Forbidden"); return; }

    fs.stat(file, (err, st) => {
      if (!err && st.isDirectory()) {
        res.writeHead(301, { Location: pathname + "/" + url.search }).end();
        return;
      }
      if (err) return notFound(res);
      const md = rel.endsWith(".html") && wantsMarkdown(req) ? markdownTwin(rel) : null;
      if (md) {
        fs.access(md, (missing) => {
          if (missing) return stream(req, res, file, rel);
          stream(req, res, md, rel, { "Cache-Control": "no-store", Vary: "User-Agent, Accept" });
        });
        return;
      }
      stream(req, res, file, rel);
    });
  })
  .listen(PORT, () => console.log(`Serving ${ROOT} on http://localhost:${PORT} (media from ${MEDIA})`));
