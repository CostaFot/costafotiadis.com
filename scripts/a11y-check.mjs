// Phone width and text contrast over the built site, in headless Brave.
//
//   npm run build && npm start            (in another terminal)
//   node scripts/a11y-check.mjs [--host http://localhost:3000] [--only width|contrast]
//                               [--pages /a/,/b/] [--port 9500]
//
// Width: every page in the sitemap plus the 404, at 360 and 320 px with no
// theme picked, and at 360 px in each skin. A page fails when it is wider than
// the screen, so a phone scrolls it sideways; the report names what sticks out.
// Contrast: CONTRAST_PAGES (one of every component) in light, dark and each
// skin, at desktop width with every <details> open. Text fails under 4.5:1, or
// 3:1 at 24 px (18.66 px bold), which is WCAG AA. Night Owl code blocks and the
// /projects/ desktop are skipped: both are someone else's palette, on purpose.
// The skins are read off THEMES in src/lib/site.ts. Each job gets its own
// browser on its own port from --port up, all in parallel. Exits 1 on a failure.
import { spawn } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const CONTRAST_PAGES = [
  '/', '/tag/popular/', '/tag/android/', '/me/', '/elsewhere/', '/things/', '/stats/', '/projects/', '/lab/', '/lab/clippy/',
  '/going-edge-to-edge-with-compose-without-losing-it/', // Kotlin, a TL;DR, the Pangram panel
  '/at-the-mountains-of-madness-interviews/', // a yap: series eyebrow, callouts
  '/5-stages-of-developer-grief/', // the meme gags' badges and egg count
  '/this-page-does-not-exist/', // Clippy's balloon
];

const args = process.argv.slice(2);
const opt = { host: 'http://localhost:3000', only: '', pages: '', port: 9500 };
for (let i = 0; i < args.length; i++) if (args[i].startsWith('--')) opt[args[i].slice(2)] = args[++i];
const host = opt.host.replace(/\/$/, '');
const skins = [...readFileSync(new URL('../src/lib/site.ts', import.meta.url), 'utf8').matchAll(/id: '([\w-]+)'[^}]*scheme:/g)].map((m) => m[1]);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function sitemapPaths() {
  const index = await (await fetch(`${host}/sitemap-index.xml`)).text();
  const paths = [];
  for (const [, loc] of index.matchAll(/<loc>([^<]+)<\/loc>/g)) {
    const xml = await (await fetch(host + new URL(loc).pathname)).text();
    for (const [, url] of xml.matchAll(/<loc>([^<]+)<\/loc>/g)) paths.push(new URL(url).pathname);
  }
  return [...paths, '/this-page-does-not-exist/'];
}

// One browser driving one page through a list of paths.
async function job({ port, w, theme, paths, expr }) {
  const profile = mkdtempSync(join(tmpdir(), 'a11y-'));
  const browser = spawn('brave', [
    '--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, `--window-size=${w},800`,
    '--mute-audio', '--no-first-run', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', 'about:blank',
  ], { stdio: 'ignore' });
  try {
    let list;
    for (let i = 0; i < 100; i++) {
      try { list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json(); if (list.some((t) => t.type === 'page')) break; } catch {}
      await sleep(100);
    }
    const ws = new WebSocket(list.find((t) => t.type === 'page').webSocketDebuggerUrl);
    await new Promise((r) => ws.addEventListener('open', r, { once: true }));
    let id = 0;
    const waiting = new Map(), listeners = [];
    ws.addEventListener('message', (e) => {
      const m = JSON.parse(e.data);
      if (m.id && waiting.has(m.id)) { waiting.get(m.id)(m); waiting.delete(m.id); } else listeners.forEach((l) => l(m));
    });
    const send = (method, params = {}) => new Promise((resolve, reject) => {
      const n = ++id;
      waiting.set(n, (m) => (m.error ? reject(new Error(`${method}: ${m.error.message}`)) : resolve(m.result)));
      ws.send(JSON.stringify({ id: n, method, params }));
    });
    let status = 0;
    listeners.push((m) => { if (m.method === 'Network.responseReceived' && m.params.type === 'Document') status = m.params.response.status; });
    const go = async (url) => {
      const loaded = new Promise((r) => {
        const t = setTimeout(r, 15000);
        const l = (m) => { if (m.method === 'Page.loadEventFired') { clearTimeout(t); listeners.splice(listeners.indexOf(l), 1); r(); } };
        listeners.push(l);
      });
      await send('Page.navigate', { url });
      await loaded;
      await sleep(1200);
    };
    const evaluate = async (expression) => {
      const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
      if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
      return r.result.value;
    };
    await send('Page.enable');
    await send('Runtime.enable');
    await send('Network.enable');
    await send('Network.setBlockedURLs', { urls: ['*umami*'] }); // a headless visit is not a reader
    await send('Emulation.setDeviceMetricsOverride', { width: w, height: 800, deviceScaleFactor: 2, mobile: w < 600 });
    await go(`${host}/`);
    await evaluate(theme === 'auto' ? `localStorage.removeItem('theme')` : `localStorage.setItem('theme', ${JSON.stringify(theme)})`);
    const results = [];
    for (const path of paths) {
      try {
        await go(host + path);
        if (status !== 200 && path !== '/this-page-does-not-exist/') results.push({ path, error: `HTTP ${status}` });
        else results.push({ path, ...(await evaluate(expr)) });
      } catch (e) { results.push({ path, error: String(e.message || e) }); }
    }
    ws.close();
    return results;
  } finally {
    browser.kill('SIGKILL');
    rmSync(profile, { recursive: true, force: true });
  }
}

const DESC = `const desc = (el) => { const bits = []; for (let e = el, i = 0; e && e !== document.body && i < 3; e = e.parentElement, i++) bits.unshift(e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + [...e.classList].slice(0, 2).map((c) => '.' + c).join('')); return bits.join(' > '); };`;

const WIDTH = `(() => { ${DESC}
  const de = document.documentElement, vw = de.clientWidth, sw = de.scrollWidth;
  if (sw <= vw) return { sw, vw };
  const out = [];
  for (const el of document.body.querySelectorAll('*')) {
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.right <= vw + 1) continue;
    const s = getComputedStyle(el);
    if (s.position === 'fixed' || s.visibility !== 'visible') continue;
    if ([...el.children].some((c) => c.getBoundingClientRect().right > vw + 1)) continue; // name the innermost
    out.push(desc(el) + ' (' + Math.round(r.right) + ' px) ' + (el.textContent || el.getAttribute('src') || '').trim().replace(/\\s+/g, ' ').slice(0, 50));
  }
  return { sw, vw, out: out.slice(0, 4) };
})()`;

const CONTRAST = `(() => { ${DESC}
  document.querySelectorAll('details').forEach((d) => (d.open = true));
  const cv = document.createElement('canvas'); cv.width = cv.height = 1;
  const cx = cv.getContext('2d', { willReadFrequently: true });
  const rgba = (c) => {
    let m = c.match(/^rgba?\\(([^)]+)\\)$/);
    if (m) { const p = m[1].split(/[\\s,\\/]+/).filter(Boolean).map(parseFloat); return [p[0], p[1], p[2], p[3] ?? 1]; }
    m = c.match(/^color\\(srgb ([^)]+)\\)$/);
    if (m) { const p = m[1].split(/[\\s\\/]+/).filter(Boolean).map(parseFloat); return [p[0] * 255, p[1] * 255, p[2] * 255, p[3] ?? 1]; }
    cx.clearRect(0, 0, 1, 1); cx.fillStyle = '#000'; cx.fillStyle = c; cx.fillRect(0, 0, 1, 1);
    const d = cx.getImageData(0, 0, 1, 1).data; return [d[0], d[1], d[2], d[3] / 255];
  };
  const over = (t, b) => [0, 1, 2].map((i) => t[i] * t[3] + b[i] * (1 - t[3])).concat(1);
  const lum = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
  const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
  const hex = (c) => '#' + c.slice(0, 3).map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');
  const out = [], seen = new Set();
  const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n; (n = walk.nextNode()); ) {
    const el = n.parentElement;
    if (!el || seen.has(el) || !n.textContent.trim()) continue;
    seen.add(el);
    if (el.closest('script, style, template, noscript, svg, pre, .desk')) continue;
    const r = el.getBoundingClientRect(), s = getComputedStyle(el);
    if (r.width < 2 || r.height < 2 || s.visibility !== 'visible') continue;
    let op = 1; const layers = [];
    for (let e = el; e; e = e.parentElement) {
      const es = getComputedStyle(e); op *= +es.opacity;
      const b = rgba(es.backgroundColor); if (b[3] > 0) { layers.push(b); if (b[3] >= 1) break; }
    }
    if (op < 0.15) continue;
    let bg = [255, 255, 255, 1]; for (const l of layers.reverse()) bg = over(l, bg);
    const c = rgba(s.color); if (c[3] === 0) continue;
    const fg = over([c[0], c[1], c[2], c[3] * op], bg);
    const size = parseFloat(s.fontSize), large = size >= 24 || (size >= 18.66 && +s.fontWeight >= 700);
    const rt = ratio(fg, bg);
    if (rt < (large ? 3 : 4.5)) out.push({ sel: desc(el), text: n.textContent.trim().replace(/\\s+/g, ' ').slice(0, 40), fg: hex(fg), bg: hex(bg), ratio: rt });
  }
  return { fails: out };
})()`;

try { await fetch(host + '/'); } catch { console.error(`nothing at ${host}: run npm run build && npm start first`); process.exit(2); }
const all = opt.pages ? opt.pages.split(',') : await sitemapPaths();
const jobs = [];
if (opt.only !== 'contrast') {
  jobs.push({ kind: 'width', w: 360, theme: 'auto' }, { kind: 'width', w: 320, theme: 'auto' });
  for (const s of skins) jobs.push({ kind: 'width', w: 360, theme: s });
}
if (opt.only !== 'width') for (const t of ['light', 'dark', ...skins]) jobs.push({ kind: 'contrast', w: 1280, theme: t });
console.log(`${jobs.length} jobs over ${host}: width on ${all.length} pages, contrast on ${(opt.pages ? all : CONTRAST_PAGES).length} (skins: ${skins.join(', ')})`);

const done = await Promise.all(jobs.map((j, i) => job({
  ...j, port: +opt.port + i, expr: j.kind === 'width' ? WIDTH : CONTRAST,
  paths: j.kind === 'width' || opt.pages ? all : CONTRAST_PAGES,
}).then((results) => ({ ...j, results }))));

let failed = 0;
for (const j of done) {
  const label = `${j.kind} · ${j.theme} · ${j.w} px`;
  const lines = [];
  for (const r of j.results.filter((r) => r.error)) lines.push(`  ${r.path}: ${r.error}`);
  if (j.kind === 'width') {
    for (const r of j.results.filter((r) => r.sw > r.vw)) lines.push(`  ${r.path} is ${r.sw} px wide on a ${r.vw} px screen`, ...(r.out || []).map((o) => `      ${o}`));
  } else {
    const groups = new Map();
    for (const r of j.results) for (const f of r.fails || []) {
      const key = `${f.sel.split(' > ').slice(-2).join(' > ')} ${f.fg} on ${f.bg}`;
      const g = groups.get(key) || { min: 99, n: 0, pages: new Set(), text: f.text };
      g.min = Math.min(g.min, f.ratio); g.n++; g.pages.add(r.path); groups.set(key, g);
    }
    for (const [key, g] of [...groups].sort((a, b) => a[1].min - b[1].min)) lines.push(`  ${g.min.toFixed(2)}:1  ${key}  ×${g.n} on ${g.pages.size} page(s), e.g. "${g.text}"`);
  }
  failed += lines.length;
  console.log(`\n${lines.length ? '✗' : '✓'} ${label}${lines.length ? '' : ': nothing'}`);
  if (lines.length) console.log(lines.join('\n'));
}
process.exit(failed ? 1 : 0);
