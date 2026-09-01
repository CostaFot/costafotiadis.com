// Downloads images that posts still hotlink from third-party CDNs (Medium,
// Wix, ...) into src/images/YYYY/MM/ next to the post's other assets and
// rewrites the Markdown to the relative path. Safe to rerun: existing files
// are reused, already-local references are untouched.
//
// Usage: node scripts/localize-remote-images.js

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const CONTENT = path.join(ROOT, 'src', 'content');
const REMOTE = /https?:\/\/[^\s)"'<>]+/;

const files = ['posts', 'pages'].flatMap((d) =>
  fs.readdirSync(path.join(CONTENT, d)).filter((f) => f.endsWith('.md')).map((f) => path.join(CONTENT, d, f)));

function safeName(url) {
  const last = decodeURIComponent(new URL(url).pathname.split('/').pop() || 'image');
  return last.replace(/[^A-Za-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '');
}

const extByType = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/gif': '.gif', 'image/webp': '.webp', 'image/svg+xml': '.svg' };

(async () => {
  const failed = [];
  let downloaded = 0, rewritten = 0;
  for (const file of files) {
    let md = fs.readFileSync(file, 'utf8');
    const date = /^date_published: (\d{4})-(\d{2})/m.exec(md);
    if (!date) continue;
    const dir = path.join(ROOT, 'src', 'images', date[1], date[2]);
    const relDir = path.relative(path.dirname(file), dir).replace(/\\/g, '/');

    // Markdown images, <img src>, and the feature_image frontmatter key.
    const refs = new Set();
    for (const m of md.matchAll(/!\[[^\]]*\]\((https?:\/\/[^)\s]+)\)/g)) refs.add(m[1]);
    for (const m of md.matchAll(/<img[^>]+src="(https?:\/\/[^"]+)"/g)) refs.add(m[1]);
    for (const m of md.matchAll(/^feature_image: (https?:\/\/\S+)$/gm)) refs.add(m[1]);

    for (const url of refs) {
      let name = safeName(url);
      let dest = path.join(dir, name);
      const existing = fs.existsSync(dest) ? dest : fs.readdirSync(fs.existsSync(dir) ? dir : ROOT).map((f) => path.join(dir, f)).find((f) => path.basename(f).replace(/\.[a-z0-9]+$/i, '') === name && fs.existsSync(f));
      if (existing) {
        dest = existing;
      } else {
        try {
          const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (costafotiadis.com asset migration)' } });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const type = (res.headers.get('content-type') || '').split(';')[0];
          if (!path.extname(name) && extByType[type]) { name += extByType[type]; dest = path.join(dir, name); }
          if (!type.startsWith('image/')) throw new Error(`not an image: ${type}`);
          fs.mkdirSync(dir, { recursive: true });
          fs.writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
          downloaded++;
        } catch (e) {
          failed.push(`${path.basename(file)}: ${url} — ${e.message}`);
          continue;
        }
      }
      const rel = `${relDir}/${path.basename(dest)}`;
      md = md.split(url).join(rel);
      rewritten++;
    }
    fs.writeFileSync(file, md);
  }
  console.log(`${downloaded} downloaded, ${rewritten} references rewritten, ${failed.length} failed`);
  for (const f of failed) console.error(`  ! ${f}`);
  process.exitCode = failed.length ? 1 : 0;
})();
