#!/usr/bin/env node
// Walk every link the published surface points at and report the dead ones:
// the live site (every page in the sitemap) and the README of every public
// repo under CostaFot. Nothing here writes; it prints what is broken.
//
//   node scripts/linkrot.mjs               # human output, exit 1 if anything is broken
//   node scripts/linkrot.mjs --json        # the same as JSON, exit 0
//   node scripts/linkrot.mjs --site        # site only
//   node scripts/linkrot.mjs --repos       # READMEs only
//   node scripts/linkrot.mjs --verbose     # also list what came back blocked
//
// A link is "broken" on 404/410, another 4xx that is not an anti-bot wall, a
// 5xx twice in a row, a dead host or a timeout. Hosts that fence off scripts
// (x.com, LinkedIn, Reddit and friends) answer 403/429/999 to anything without
// a browser, so those are counted as "blocked" and kept out of the verdict:
// they are noise, not rot. Everything is tried twice before it is called dead.

const args = process.argv.slice(2);
const asJson = args.includes('--json');
const verbose = args.includes('--verbose');
const siteOnly = args.includes('--site');
const reposOnly = args.includes('--repos');

const SITE = 'https://www.costafotiadis.com';
const OWNER = 'CostaFot';
const UA = 'costafotiadis.com link check (+https://www.costafotiadis.com)';
const CONCURRENCY = 8;
const TIMEOUT_MS = 20_000;

// Answer 403/429/999 to anything that is not a browser. Being fenced out says
// nothing about whether the link still resolves for a human.
const BOT_WALLS = [
  'x.com', 'twitter.com', 'linkedin.com', 'reddit.com', 'instagram.com',
  'facebook.com', 'medium.com', 'amazon.com', 'amazon.co.uk', 'quora.com',
  'stackoverflow.com', 'crunchbase.com', 'glassdoor.com', 'udemy.com',
  'googlesource.com', // 503s every non-interactive client, browser user-agent or not
];

const isWalled = (host) => BOT_WALLS.some((h) => host === h || host.endsWith(`.${h}`));

async function get(url, init = {}) {
  return fetch(url, {
    redirect: 'follow',
    headers: { 'user-agent': UA, accept: '*/*' },
    signal: AbortSignal.timeout(TIMEOUT_MS),
    ...init,
  });
}

async function text(url) {
  const res = await get(url);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.text();
}

// --- collecting -------------------------------------------------------------

// Every <loc> in the sitemap, following a sitemap index one level down.
async function sitemapUrls() {
  const locs = (xml) => [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());
  const root = await text(`${SITE}/sitemap.xml`);
  if (!/<sitemapindex/.test(root)) return locs(root);
  const out = [];
  for (const child of locs(root)) out.push(...locs(await text(child)));
  return out;
}

function linksInHtml(html, base) {
  const out = new Set();
  for (const m of html.matchAll(/<a\b[^>]*\bhref\s*=\s*["']([^"']+)["']/gi)) {
    const abs = absolute(m[1], base);
    if (abs) out.add(abs);
  }
  return out;
}

function linksInMarkdown(md, base) {
  const out = new Set();
  const add = (raw) => { const abs = absolute(raw, base); if (abs) out.add(abs); };
  for (const m of md.matchAll(/\]\(\s*<?([^)\s>]+)>?(?:\s+["'][^)]*["'])?\s*\)/g)) add(m[1]);   // [text](url)
  for (const m of md.matchAll(/^\s*\[[^\]]+\]:\s*<?(\S+)>?/gm)) add(m[1]);                      // [ref]: url
  for (const m of md.matchAll(/<(https?:\/\/[^>\s]+)>/g)) add(m[1]);                            // <url>
  for (const m of md.matchAll(/\b(?:src|href)\s*=\s*["'](https?:\/\/[^"']+)["']/gi)) add(m[1]); // inline HTML
  return out;
}

// Absolute http(s) URL, fragment dropped, or null for anything not worth a request.
function absolute(raw, base) {
  const href = raw.trim();
  if (!href || href.startsWith('#')) return null;
  if (/^(mailto|tel|javascript|data|sms|ftp):/i.test(href)) return null;
  let u;
  try { u = new URL(href, base); } catch { return null; }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
  if (['localhost', '127.0.0.1', '0.0.0.0', '::1'].includes(u.hostname)) return null;
  if (u.hostname.endsWith('.local')) return null;
  // Placeholders left in a README (https://.../, https://<host>/) are not links.
  if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/i.test(u.hostname)) return null;
  u.hash = '';
  return u.toString();
}

async function collectSite(found) {
  const pages = await sitemapUrls();
  await pool(pages, async (page) => {
    let html;
    try { html = await text(page); } catch (err) {
      note(found, page, `${SITE.replace('https://', '')} sitemap`, err);
      return;
    }
    const where = page.replace(`${SITE}`, '') || '/';
    for (const link of linksInHtml(html, page)) record(found, link, where);
  });
  return pages.length;
}

async function repos() {
  const headers = { 'user-agent': UA, accept: 'application/vnd.github+json' };
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  if (token) headers.authorization = `Bearer ${token}`;
  const out = [];
  for (let page = 1; page <= 4; page++) {
    const res = await get(`https://api.github.com/users/${OWNER}/repos?per_page=100&type=owner&page=${page}`, { headers });
    if (!res.ok) throw new Error(`github repo list: ${res.status} ${res.statusText}`);
    const batch = await res.json();
    out.push(...batch.filter((r) => !r.fork && !r.private && !r.archived));
    if (batch.length < 100) break;
  }
  return out;
}

async function collectRepos(found) {
  const list = await repos();
  let read = 0;
  await pool(list, async (repo) => {
    const base = `https://raw.githubusercontent.com/${OWNER}/${repo.name}/HEAD/README.md`;
    let md;
    try { md = await text(base); } catch { return; } // no README is not rot
    read++;
    for (const link of linksInMarkdown(md, `https://github.com/${OWNER}/${repo.name}/blob/HEAD/`)) {
      record(found, link, `${repo.name}/README.md`);
    }
  });
  return read;
}

function record(found, url, where) {
  const seen = found.get(url);
  if (seen) seen.add(where); else found.set(url, new Set([where]));
}

function note(found, url, where, err) {
  record(found, url, where);
  found.get(url).unreachable = err.message;
}

// --- checking ---------------------------------------------------------------

async function check(url) {
  const host = new URL(url).hostname;
  let last = null;
  for (const attempt of [0, 1]) {
    try {
      // Plenty of servers mishandle HEAD — a 405, a 501, or a redirect loop that
      // only happens without a body. Ask again properly before judging any of it.
      let res;
      try {
        res = await get(url, { method: 'HEAD' });
        if ([403, 404, 405, 429, 501].includes(res.status)) res = await get(url, { method: 'GET' });
      } catch {
        res = await get(url, { method: 'GET' });
      }
      if (res.ok || res.status < 400) return { ok: true, status: res.status };
      if ([401, 403, 429, 999].includes(res.status) || isWalled(host)) {
        return { ok: false, blocked: true, status: res.status };
      }
      last = { ok: false, status: res.status };
      if (res.status < 500) return last; // a 404 does not get better on a retry
    } catch (err) {
      last = { ok: false, error: err.name === 'TimeoutError' ? `timed out after ${TIMEOUT_MS / 1000}s` : String(err.message || err) };
    }
    if (attempt === 0) await new Promise((r) => setTimeout(r, 1500));
  }
  if (isWalled(host)) return { ...last, blocked: true };
  return last;
}

async function pool(items, fn, size = CONCURRENCY) {
  const queue = [...items];
  const workers = Array.from({ length: Math.min(size, queue.length) }, async () => {
    while (queue.length) await fn(queue.shift());
  });
  await Promise.all(workers);
}

// --- run --------------------------------------------------------------------

const found = new Map();
const counts = { pages: 0, readmes: 0 };
try {
  if (!reposOnly) counts.pages = await collectSite(found);
  if (!siteOnly) counts.readmes = await collectRepos(found);
} catch (err) {
  console.error(`link check could not gather its sources: ${err.message}`);
  process.exit(2);
}

const broken = [];
const blocked = [];
await pool([...found.keys()], async (url) => {
  const result = await check(url);
  if (result.ok) return;
  const entry = {
    url,
    status: result.status ?? null,
    error: result.error ?? null,
    sources: [...found.get(url)].sort(),
  };
  (result.blocked ? blocked : broken).push(entry);
});

const bySource = (a, b) => a.sources[0].localeCompare(b.sources[0]) || a.url.localeCompare(b.url);
broken.sort(bySource);
blocked.sort(bySource);

if (asJson) {
  console.log(JSON.stringify({
    checkedAt: new Date().toISOString(),
    links: found.size,
    pages: counts.pages,
    readmes: counts.readmes,
    broken,
    blocked,
  }, null, 2));
  process.exit(0);
}

const reason = (e) => e.error || `HTTP ${e.status}`;
console.log(`${found.size} links, ${counts.pages} pages, ${counts.readmes} READMEs`);
if (!broken.length) {
  console.log('nothing broken');
} else {
  console.log(`\n${broken.length} broken:`);
  for (const e of broken) console.log(`  ${e.url}\n    ${reason(e)} — ${e.sources.join(', ')}`);
}
if (verbose && blocked.length) {
  console.log(`\n${blocked.length} blocked (anti-bot, not rot):`);
  for (const e of blocked) console.log(`  ${e.url}\n    ${reason(e)} — ${e.sources.join(', ')}`);
} else if (blocked.length) {
  console.log(`\n${blocked.length} blocked by anti-bot walls, not counted (--verbose to list)`);
}
process.exit(broken.length ? 1 : 0);
