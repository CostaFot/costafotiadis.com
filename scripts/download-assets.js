// Downloads every image/file the Ghost export references from the live site
// into src/images/ and public/files/, mirroring Ghost's /content/ paths.
//
// Usage: node scripts/download-assets.js

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SITE_URL = 'https://www.costafotiadis.com';

const exportFile = fs.readdirSync(path.join(ROOT, 'exports'))
  .filter((f) => f.endsWith('.json')).sort().pop();
const raw = fs.readFileSync(path.join(ROOT, 'exports', exportFile), 'utf8');

const paths = new Set();
for (const m of raw.matchAll(/__GHOST_URL__\/content\/(images|files|media)\/[^"\\)\s]+/g)) {
  // Resized variants (/images/size/wNNN/...) map back to the original upload.
  paths.add(m[0]
    .replace('__GHOST_URL__/content/', '')
    .replace(/^images\/size\/w\d+\//, 'images/'));
}

(async () => {
  let ok = 0, skipped = 0;
  const failed = [];
  const queue = [...paths];
  const workers = Array.from({ length: 5 }, async () => {
    for (let p; (p = queue.shift()) !== undefined;) {
      const dest = path.join(ROOT, p.startsWith('images/') ? path.join('src', p) : path.join('public', p));
      if (fs.existsSync(dest)) { skipped++; continue; }
      const url = `${SITE_URL}/content/${p.split('/').map(encodeURIComponent).join('/')}`;
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        fs.mkdirSync(path.dirname(dest), { recursive: true });
        fs.writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
        ok++;
      } catch (e) {
        failed.push(`${url} — ${e.message}`);
      }
    }
  });
  await Promise.all(workers);
  console.log(`${ok} downloaded, ${skipped} already present, ${failed.length} failed of ${paths.size} total`);
  for (const f of failed) console.error(`  ! ${f}`);
  process.exitCode = failed.length ? 1 : 0;
})();
