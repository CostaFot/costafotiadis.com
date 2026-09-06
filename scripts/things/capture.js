#!/usr/bin/env node
// Write a new things entry. Used by the /things skill (skill/things/SKILL.md).
//   node scripts/things/capture.js --type link  --url URL [--text "comment"]
//   node scripts/things/capture.js --type idea  --text "…"
//   node scripts/things/capture.js --type note  --text "…"
//   node scripts/things/capture.js --type photo --file /path/to.jpg [--text "caption"]
//   node scripts/things/capture.js --type video --file /path/to.mp4 [--text "caption"]
// Options: --no-fetch (skip title/preview), --date ISO (override, must carry an offset),
//          --no-upload (video: keep the local media/ copy only, skip the Railway upload),
//          --no-transcode (video: store the file as-is, no poster),
//          --no-issue (idea: do not open a Linear issue)
// An idea also opens a backlog issue on the Linear board (src/lib/linear.mjs,
// createIssue) with LINEAR_API_KEY from the environment or .env, and the entry
// records it as `issue: { id, url }`. Without the key, or when Linear fails,
// the entry is still written and a warning says the issue is missing.
// Entries go to src/content/things/<id>.json, photos and link previews to
// src/images/things/ (referenced from the entry as ../../images/things/…, the
// same relative form the posts use, so Astro optimises them).
// Videos are not committed: the file is transcoded with ffmpeg to H.264/AAC
// (phone HEVC does not play in Chrome on Linux or in Firefox) with the index up
// front, a poster frame is extracted, both land in media/<id>.* (gitignored
// mirror) and are uploaded to the Railway volume with `railway volume files upload`.
// The schema lives in src/content.config.ts; `npx astro sync` checks the entry.
// Prints the path of the written file, then the entry JSON. Exits 1 on any problem.
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { fetchMeta, downloadImage, domainOf } = require("./fetch-meta.js");

const ROOT = path.resolve(__dirname, "..", "..");
// .env holds LINEAR_API_KEY on Costa's machines; variables already set win.
try { process.loadEnvFile(path.join(ROOT, ".env")); } catch {}
const ENTRIES = path.join(ROOT, "src", "content", "things");
const IMAGES = path.join(ROOT, "src", "images", "things");
const IMAGE_REF = "../../images/things"; // how an entry in ENTRIES refers to IMAGES
const DATE_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/;

// Railway volume `media`, mounted at /data on the `website` service. server.js
// serves /data/media/* as /media/*. Ids are in AGENTS.md too.
const RAILWAY = {
  project: "a3f8e24b-b4f8-4a79-bec2-6202b9bd5b88",
  service: "a7b99566-4178-4673-a9b7-9a33703cb232",
  env: "c72ba765-1567-45df-ad70-cf19668ba09d",
  volume: "media",
};
const VIDEO_EXT = [".mp4", ".webm", ".mov"];

function hasFfmpeg() {
  return spawnSync("ffmpeg", ["-version"], { stdio: "ignore" }).status === 0;
}

// H.264 High + AAC in an mp4 with the moov atom first; max 1920 px wide,
// even dimensions, rotation metadata baked in. Returns nothing, throws on failure.
function transcode(from, to) {
  const r = spawnSync("ffmpeg", ["-y", "-hide_banner", "-loglevel", "error", "-i", from,
    "-map", "0:v:0", "-map", "0:a:0?", "-c:v", "libx264", "-preset", "medium", "-crf", "23", "-pix_fmt", "yuv420p",
    "-vf", "scale='min(1920,iw)':-2", "-c:a", "aac", "-b:a", "128k", "-ac", "2",
    "-movflags", "+faststart", to], { encoding: "utf8", stdio: ["ignore", "ignore", "pipe"] });
  if (r.status !== 0) throw new Error(`ffmpeg transcode failed: ${r.stderr.trim()}`);
}

function poster(from, to) {
  const r = spawnSync("ffmpeg", ["-y", "-hide_banner", "-loglevel", "error", "-ss", "0.5", "-i", from,
    "-frames:v", "1", "-vf", "scale='min(1280,iw)':-2", "-q:v", "4", to], { encoding: "utf8", stdio: ["ignore", "ignore", "pipe"] });
  if (r.status !== 0) throw new Error(`ffmpeg poster failed: ${r.stderr.trim()}`);
}

function uploadToVolume(local, remote) {
  const argv = ["volume", "-p", RAILWAY.project, "-s", RAILWAY.service, "-e", RAILWAY.env,
    "files", "--volume", RAILWAY.volume, "upload", local, remote, "--json"];
  const r = spawnSync("railway", argv, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  if (r.error) throw new Error(`railway CLI not runnable: ${r.error.message}`);
  if (r.status !== 0) throw new Error(`railway upload failed: ${(r.stderr || r.stdout).trim()}`);
  return r.stdout.trim();
}

function args() {
  const a = process.argv.slice(2), o = {};
  for (let i = 0; i < a.length; i++) {
    if (!a[i].startsWith("--")) throw new Error(`unexpected argument: ${a[i]}`);
    const k = a[i].slice(2);
    if (k === "no-fetch") { o.noFetch = true; continue; }
    if (k === "no-upload") { o.noUpload = true; continue; }
    if (k === "no-transcode") { o.noTranscode = true; continue; }
    if (k === "no-issue") { o.noIssue = true; continue; }
    o[k] = a[++i];
    if (o[k] === undefined) throw new Error(`--${k} needs a value`);
  }
  return o;
}

function localIso(d = new Date()) {
  const p = (n) => String(n).padStart(2, "0");
  const off = -d.getTimezoneOffset();
  const sign = off >= 0 ? "+" : "-";
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}${sign}${p(Math.floor(Math.abs(off) / 60))}:${p(Math.abs(off) % 60)}`;
}

function utcStamp(d) {
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}${p(d.getUTCMonth() + 1)}${p(d.getUTCDate())}_${p(d.getUTCHours())}${p(d.getUTCMinutes())}${p(d.getUTCSeconds())}`;
}

async function main() {
  const o = args();
  const type = o.type;
  if (!["idea", "note", "link", "photo", "video"].includes(type)) throw new Error("--type must be idea|note|link|photo|video");
  const text = (o.text || "").trim();
  if ((type === "idea" || type === "note") && !text) throw new Error(`--text is required for ${type}`);
  if (type === "link" && !o.url) throw new Error("--url is required for link");
  if ((type === "photo" || type === "video") && !o.file) throw new Error(`--file is required for ${type}`);
  if (o.date && !DATE_RE.test(o.date)) throw new Error("--date must be ISO with an explicit offset");

  const date = o.date || localIso();
  const when = new Date(date);
  fs.mkdirSync(ENTRIES, { recursive: true });
  let id, tries = 0;
  do { id = utcStamp(new Date(when.getTime() + tries++ * 1000)); } while (fs.existsSync(path.join(ENTRIES, `${id}.json`)));

  const e = { schema: 1, id, date, type, source: "claude", text };

  if (type === "link") {
    const url = new URL(o.url).href; // throws on garbage
    e.url = url;
    e.title = domainOf(url);
    if (!o.noFetch) {
      const meta = await fetchMeta(url);
      if (meta.title) e.title = meta.title;
      if (meta.image) {
        const src = await downloadImage(meta.image, path.join(IMAGES, "previews"), id, IMAGES);
        if (src) e.preview = { src: `${IMAGE_REF}/${src}`, origin: meta.image };
      }
    }
  }

  if (type === "photo") {
    const from = path.resolve(o.file);
    if (!fs.existsSync(from)) throw new Error(`no such file: ${from}`);
    const ext = path.extname(from).toLowerCase().replace(/^\.jpeg$/, ".jpg");
    if (![".jpg", ".png", ".webp", ".gif"].includes(ext)) throw new Error(`unsupported image type: ${ext}`);
    fs.mkdirSync(IMAGES, { recursive: true });
    const to = path.join(IMAGES, `${id}${ext}`);
    if (from !== to) {
      if (from.startsWith(IMAGES + path.sep)) fs.renameSync(from, to); else fs.copyFileSync(from, to);
    }
    e.image = `${IMAGE_REF}/${id}${ext}`;
  }

  const uploads = [];
  if (type === "video") {
    const from = path.resolve(o.file);
    if (!fs.existsSync(from)) throw new Error(`no such file: ${from}`);
    const srcExt = path.extname(from).toLowerCase();
    if (!VIDEO_EXT.includes(srcExt)) throw new Error(`unsupported video type: ${srcExt} (want ${VIDEO_EXT.join("|")})`);
    fs.mkdirSync(path.join(ROOT, "media"), { recursive: true });
    const doTranscode = !o.noTranscode && hasFfmpeg();
    if (!doTranscode && !o.noTranscode) console.error("warning: ffmpeg not found, storing the video as-is (may not play in every browser)");
    const rel = `media/${id}${doTranscode ? ".mp4" : srcExt}`;
    const to = path.join(ROOT, rel);
    if (doTranscode) {
      console.error(`transcoding ${path.basename(from)} -> ${rel} …`);
      transcode(from, to);
      const posterRel = `media/${id}.jpg`;
      poster(to, path.join(ROOT, posterRel));
      e.poster = posterRel;
      uploads.push({ local: path.join(ROOT, posterRel), remote: `/${posterRel}` });
    } else if (from !== to) {
      fs.copyFileSync(from, to);
    }
    e.video = rel;
    uploads.push({ local: to, remote: `/${rel}` });
  }

  if (!o.noUpload) {
    for (const u of uploads) {
      console.error(`uploading ${(fs.statSync(u.local).size / 1e6).toFixed(1)} MB to railway volume ${RAILWAY.volume}:${u.remote} …`);
      uploadToVolume(u.local, u.remote);
    }
  }

  // An idea is also a backlog issue on the board. The title is the first line
  // as typed (the voice rule applies to the site; an agent may retitle later).
  if (type === "idea" && !o.noIssue) {
    const apiKey = process.env.LINEAR_API_KEY;
    if (!apiKey) {
      console.error("warning: LINEAR_API_KEY not set (put it in .env), no Linear issue opened; `linear issue create` can add one by hand");
    } else {
      try {
        const { createIssue } = await import("../../src/lib/linear.mjs");
        const title = text.split("\n")[0].trim().slice(0, 120);
        const description = `${text}\n\n---\nFrom [things](https://www.costafotiadis.com/things/#${id}).`;
        e.issue = await createIssue({ apiKey, title, description, signal: AbortSignal.timeout(10000) });
        console.error(`linear: ${e.issue.id} ${e.issue.url}`);
      } catch (err) {
        console.error(`warning: Linear issue not opened (${err.message}); the entry is saved without one`);
      }
    }
  }
  const file = path.join(ENTRIES, `${id}.json`);
  fs.writeFileSync(file, JSON.stringify(e, null, 2) + "\n");
  console.log(path.relative(ROOT, file));
  console.log(JSON.stringify(e, null, 2));
}

main().catch((err) => { console.error(err.message); process.exit(1); });
