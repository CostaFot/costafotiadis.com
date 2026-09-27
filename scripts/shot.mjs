// Headless Brave over the DevTools protocol, for checking a gag frame by frame.
//
//   node scripts/shot.mjs --url http://localhost:3000/glide-review/ --port 9311 \
//     [--w 1280 --h 800] [--theme light|dark|geocities|win95] [--reduce] [--wait 800] \
//     --js "<expr run before shot 1>" --out a.png  --js "<expr before shot 2>" --out b.png ...
//
// Each --out is one screenshot, taken after the --js given before it (if any)
// has finished (top-level await works: the expression is wrapped in an async
// function; `return` a value to see it printed). Page errors and console
// errors are printed at the end. Use a different --port per concurrent run.
// Handy inside --js: the gag's layer is document.querySelector('.<class>'),
// its click is layer.querySelector('.gag-hit').click(), and Web Animations
// can be frozen at a moment with
//   document.getAnimations().forEach(a => { a.pause(); a.currentTime = 700 })
import { spawn } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const args = process.argv.slice(2);
const opt = { w: 1280, h: 800, port: 9311, wait: 800, theme: '', reduce: false, url: '' };
const steps = [];
let pendingJs;
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === '--reduce') opt.reduce = true;
  else if (a === '--js') pendingJs = args[++i];
  else if (a === '--out') { steps.push({ js: pendingJs, out: args[++i] }); pendingJs = undefined; }
  else if (a.startsWith('--')) opt[a.slice(2)] = args[++i];
}
if (pendingJs) steps.push({ js: pendingJs });
if (!opt.url) { console.error('need --url'); process.exit(2); }

const profile = mkdtempSync(join(tmpdir(), 'shot-'));
const browser = spawn('brave', [
  '--headless=new', `--remote-debugging-port=${opt.port}`, `--user-data-dir=${profile}`,
  `--window-size=${opt.w},${opt.h}`, '--hide-scrollbars', '--mute-audio', '--no-first-run',
  '--autoplay-policy=no-user-gesture-required', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', 'about:blank',
], { stdio: 'ignore' });
const cleanup = () => { try { browser.kill('SIGKILL'); } catch {} try { rmSync(profile, { recursive: true, force: true }); } catch {} };
process.on('exit', cleanup);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let list;
for (let i = 0; i < 100; i++) {
  try { list = await (await fetch(`http://127.0.0.1:${opt.port}/json/list`)).json(); if (list.some((t) => t.type === 'page')) break; } catch {}
  await sleep(100);
}
const page = list?.find((t) => t.type === 'page');
if (!page) { console.error('no page target'); process.exit(1); }

const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener('open', r, { once: true }));
let id = 0;
const waiting = new Map(), listeners = [];
ws.addEventListener('message', (e) => {
  const m = JSON.parse(e.data);
  if (m.id && waiting.has(m.id)) { waiting.get(m.id)(m); waiting.delete(m.id); }
  else listeners.forEach((l) => l(m));
});
const send = (method, params = {}) => new Promise((resolve, reject) => {
  const n = ++id;
  waiting.set(n, (m) => (m.error ? reject(new Error(`${method}: ${m.error.message}`)) : resolve(m.result)));
  ws.send(JSON.stringify({ id: n, method, params }));
});
const loaded = () => new Promise((r) => { const l = (m) => { if (m.method === 'Page.loadEventFired') { listeners.splice(listeners.indexOf(l), 1); r(); } }; listeners.push(l); });

const errors = [];
listeners.push((m) => {
  if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text);
  if (m.method === 'Runtime.consoleAPICalled' && ['error', 'warning'].includes(m.params.type)) errors.push(`console.${m.params.type}: ${m.params.args.map((a) => a.value ?? a.description).join(' ')}`);
  if (m.method === 'Log.entryAdded' && m.params.entry.level === 'error') errors.push(`${m.params.entry.text} ${m.params.entry.url || ''}`);
});

await send('Page.enable');
await send('Runtime.enable');
await send('Log.enable');
await send('Emulation.setDeviceMetricsOverride', { width: +opt.w, height: +opt.h, deviceScaleFactor: 1, mobile: +opt.w < 600 });
if (opt.reduce) await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });

let wait = loaded();
await send('Page.navigate', { url: opt.url });
await wait;
if (opt.theme) {
  await send('Runtime.evaluate', { expression: `localStorage.setItem('theme', ${JSON.stringify(opt.theme)})` });
  wait = loaded();
  await send('Page.reload');
  await wait;
}
await sleep(+opt.wait);

for (const [i, s] of steps.entries()) {
  if (s.js) {
    const r = await send('Runtime.evaluate', { expression: `(async () => { ${s.js} })()`, awaitPromise: true, returnByValue: true, userGesture: true });
    if (r.exceptionDetails) console.log(`step ${i + 1} threw:`, r.exceptionDetails.exception?.description || r.exceptionDetails.text);
    else if (r.result?.value !== undefined) console.log(`step ${i + 1}:`, JSON.stringify(r.result.value));
  }
  if (s.out) {
    const { data } = await send('Page.captureScreenshot', { format: 'png' });
    writeFileSync(s.out, Buffer.from(data, 'base64'));
    console.log(`wrote ${s.out}`);
  }
}
if (errors.length) console.log('page errors:\n  ' + errors.join('\n  '));
ws.close();
cleanup();
process.exit(0);
