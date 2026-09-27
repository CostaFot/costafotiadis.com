// Renders a showcase scene (scripts/showcase/<scene>/) into the looping videos
// the /projects/ cards play. A scene is a page that is a pure function of time:
//
//   window.VIEWPORT = { width, height, scale }   CSS size and device scale (default 800x450 @2)
//   window.ready    -> Promise<duration in ms>    everything loaded, timeline built
//   window.render(ms)                             put the stage in its state at that moment
//   window.SOUNDS   = [{ t: ms, src: '/path' }]   optional, for the version with sound
//
// Headless Chrome steps it frame by frame over the DevTools protocol, so the
// motion is exact however slow the capture is, and ffmpeg encodes the frames.
// The page is served with the scene folder over public/ (so /lab/clippy/map.png
// resolves) and /cursors/<name>.png, the Adwaita cursors extracted on first use.
//
//   node scripts/showcase/render.mjs <scene>               the loop, into showcase-out/<scene>/
//   node scripts/showcase/render.mjs <scene> --gif         also a GIF (800 px, 15 fps) for a README
//   node scripts/showcase/render.mjs <scene> --stills 3.5 6.4   PNG stills at those seconds
//   node scripts/showcase/render.mjs <scene> --serve       serve it; open /?play or /?t=12.5
//   --fps 30 (default)
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn, execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '../..');
const PUBLIC = path.join(REPO, 'public');

const args = process.argv.slice(2);
const scene = args[0];
const flag = (name) => args.includes(name);
const after = (name) => {
  const out = [];
  for (const a of args.slice(args.indexOf(name) + 1)) { if (a.startsWith('--')) break; out.push(a); }
  return args.includes(name) ? out : [];
};
if (!scene || scene.startsWith('--')) {
  console.error('usage: render.mjs <scene> [--gif] [--stills s1 s2 …] [--serve] [--fps n]');
  process.exit(2);
}
const SCENE = path.join(HERE, scene);
if (!fs.existsSync(path.join(SCENE, 'index.html'))) { console.error(`no scene at ${SCENE}/index.html`); process.exit(2); }
const OUT = path.join(REPO, 'showcase-out', scene);
const CURSORS = path.join(REPO, 'showcase-out', '.cursors');
const fps = parseInt(after('--fps')[0] || '30', 10);

// ---- cursors: the largest image of an Xcursor file, as PNG --------------------
// Taken from the installed theme rather than committed (the theme's licence
// travels with the theme). Hotspots at that size go in <name>.json.
function cursorPng(name) {
  const out = path.join(CURSORS, `${name}.png`);
  if (fs.existsSync(out)) return out;
  const src = path.join('/usr/share/icons/Adwaita/cursors', name);
  if (!/^[\w-]+$/.test(name) || !fs.existsSync(src)) return null;
  const b = fs.readFileSync(src);
  let best = null;
  for (let i = 0; i < b.readUInt32LE(12); i++) {
    const o = 16 + i * 12;
    if (b.readUInt32LE(o) !== 0xfffd0002) continue;
    const size = b.readUInt32LE(o + 4);
    if (!best || size > best.size) best = { size, pos: b.readUInt32LE(o + 8) };
  }
  const p = best.pos;
  const w = b.readUInt32LE(p + 16), h = b.readUInt32LE(p + 20);
  const px = Buffer.from(b.subarray(p + 36, p + 36 + w * h * 4)); // premultiplied BGRA
  for (let i = 0; i < px.length; i += 4) {
    const a = px[i + 3];
    if (a && a < 255) for (let k = 0; k < 3; k++) px[i + k] = Math.min(255, Math.round((px[i + k] * 255) / a));
  }
  fs.mkdirSync(CURSORS, { recursive: true });
  fs.writeFileSync(out + '.raw', px);
  execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'bgra', '-s', `${w}x${h}`, '-i', out + '.raw', out]);
  fs.unlinkSync(out + '.raw');
  fs.writeFileSync(path.join(CURSORS, `${name}.json`), JSON.stringify({ size: w, hotspot: [b.readUInt32LE(p + 24), b.readUInt32LE(p + 28)] }));
  return out;
}

// ---- the server ----------------------------------------------------------------
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.woff2': 'font/woff2' };
function resolve(urlPath) {
  const rel = decodeURIComponent(urlPath).replace(/^\/+/, '') || 'index.html';
  const m = /^cursors\/([\w-]+)\.(png|json)$/.exec(rel);
  if (m) { cursorPng(m[1]); return path.join(CURSORS, `${m[1]}.${m[2]}`); }
  for (const base of [SCENE, PUBLIC]) {
    const f = path.resolve(base, rel);
    if (f.startsWith(base + path.sep) && fs.existsSync(f) && fs.statSync(f).isFile()) return f;
  }
  return null;
}
const server = http.createServer((req, res) => {
  const f = resolve(new URL(req.url, 'http://x').pathname);
  if (!f || !fs.existsSync(f)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream', 'cache-control': 'no-store' });
  fs.createReadStream(f).pipe(res);
});
await new Promise((r) => server.listen(flag('--serve') ? 4455 : 0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}`;
if (flag('--serve')) {
  console.log(`${scene}: ${base}/?play  (or ${base}/?t=12.5)`);
  await new Promise(() => {});
}

// ---- headless Chrome over the DevTools protocol -----------------------------------
const bin = process.env.CHROME || ['google-chrome-stable', 'chromium', 'brave'].find((b) => {
  try { execFileSync('which', [b], { stdio: 'ignore' }); return true; } catch { return false; }
});
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'showcase-chrome-'));
const chrome = spawn(bin, ['--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profile}`, '--hide-scrollbars',
  '--no-first-run', '--no-default-browser-check', '--disable-gpu', '--font-render-hinting=none', 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'] });
const wsUrl = await new Promise((resolve, reject) => {
  let buf = '';
  chrome.stderr.on('data', (d) => { buf += d; const m = buf.match(/DevTools listening on (ws:\/\/\S+)/); if (m) resolve(m[1]); });
  setTimeout(() => reject(new Error(`${bin} did not start: ${buf}`)), 15000);
});
const target = (await (await fetch(`http://127.0.0.1:${new URL(wsUrl).port}/json/list`)).json()).find((t) => t.type === 'page');
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener('open', r, { once: true }));
let seq = 0;
const pending = new Map();
ws.addEventListener('message', (e) => {
  const msg = JSON.parse(e.data);
  if (!msg.id || !pending.has(msg.id)) return;
  const { resolve, reject } = pending.get(msg.id);
  pending.delete(msg.id);
  if (msg.error) reject(new Error(JSON.stringify(msg.error))); else resolve(msg.result);
});
const send = (method, params = {}) => new Promise((resolve, reject) => {
  const id = ++seq;
  pending.set(id, { resolve, reject });
  ws.send(JSON.stringify({ id, method, params }));
});
const evaluate = async (expression) => {
  const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || JSON.stringify(r.exceptionDetails));
  return r.result.value;
};

async function done(code = 0) {
  ws.close();
  chrome.kill();
  await new Promise((r) => chrome.once('exit', r));
  server.close();
  fs.rmSync(profile, { recursive: true, force: true });
  process.exit(code);
}

try {
  await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 800, height: 450, deviceScaleFactor: 2, mobile: false });
  await send('Page.navigate', { url: `${base}/index.html` });
  let duration = 0;
  for (let i = 0; i < 150 && !duration; i++) {
    try { duration = await evaluate('window.ready'); } catch (e) { if (i === 149) throw e; }
    if (!duration) await new Promise((r) => setTimeout(r, 100));
  }
  if (!duration) throw new Error('the scene never resolved window.ready');
  const vp = { width: 800, height: 450, scale: 2, ...(await evaluate('window.VIEWPORT || {}')) };
  await send('Emulation.setDeviceMetricsOverride', { width: vp.width, height: vp.height, deviceScaleFactor: vp.scale, mobile: false });

  const frame = async (ms) => {
    await evaluate(`render(${ms}); new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))`);
    const { data } = await send('Page.captureScreenshot', { format: 'png', clip: { x: 0, y: 0, width: vp.width, height: vp.height, scale: 1 } });
    return Buffer.from(data, 'base64');
  };

  fs.mkdirSync(OUT, { recursive: true });
  if (flag('--stills')) {
    const dir = path.join(OUT, 'stills');
    fs.mkdirSync(dir, { recursive: true });
    for (const s of after('--stills')) {
      const f = path.join(dir, `t${Number(s).toFixed(2).padStart(6, '0')}.png`);
      fs.writeFileSync(f, await frame(parseFloat(s) * 1000));
      console.log(path.relative(REPO, f));
    }
    await done();
  }

  // The master: every frame, near-lossless, for the encodes below.
  const master = path.join(OUT, 'master.mp4');
  const n = Math.round((duration / 1000) * fps);
  const ff = spawn('ffmpeg', ['-loglevel', 'error', '-y', '-f', 'image2pipe', '-framerate', String(fps), '-i', '-',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '12', '-pix_fmt', 'yuv444p', master], { stdio: ['pipe', 'inherit', 'inherit'] });
  const closed = new Promise((r) => ff.on('close', r));
  for (let i = 0; i < n; i++) {
    const png = await frame((i * 1000) / fps);
    if (!ff.stdin.write(png)) await new Promise((r) => ff.stdin.once('drain', r));
    if (i % 30 === 0) process.stdout.write(`\r${scene}: frame ${i}/${n}`);
  }
  ff.stdin.end();
  if ((await closed) !== 0) throw new Error('ffmpeg failed on the master');
  console.log(`\r${scene}: ${n} frames, ${(duration / 1000).toFixed(2)} s at ${fps} fps`);

  const run = (a) => execFileSync('ffmpeg', ['-loglevel', 'error', '-y', ...a], { stdio: 'inherit' });
  const name = `${scene}-showcase`;
  const site = path.join(OUT, `${name}.mp4`);
  // For the card: muted, so no audio track; faststart so it plays while loading.
  run(['-i', master, '-c:v', 'libx264', '-preset', 'veryslow', '-crf', '24', '-tune', 'animation', '-pix_fmt', 'yuv420p',
    '-profile:v', 'high', '-movflags', '+faststart', '-an', site]);
  // The poster is frame 0, so nothing jumps when playback starts.
  run(['-i', master, '-frames:v', '1', '-q:v', '3', path.join(OUT, `${name}-poster.jpg`)]);

  const sounds = (await evaluate('window.SOUNDS || []')) || [];
  if (sounds.length) {
    const inputs = [], chains = [];
    sounds.forEach((s, i) => {
      const f = resolve(s.src);
      if (!f) throw new Error(`sound not found: ${s.src}`);
      inputs.push('-i', f);
      chains.push(`[${i + 1}]adelay=${Math.round(s.t)}:all=1[s${i}]`);
    });
    const mix = `${chains.join(';')};${sounds.map((_, i) => `[s${i}]`).join('')}amix=inputs=${sounds.length}:normalize=0,apad[a]`;
    run(['-i', master, ...inputs, '-filter_complex', mix, '-map', '0:v', '-map', '[a]', '-c:v', 'libx264', '-preset', 'veryslow',
      '-crf', '22', '-tune', 'animation', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '128k', '-shortest', '-movflags', '+faststart',
      path.join(OUT, `${name}-sound.mp4`)]);
  }
  if (flag('--gif')) {
    // Enough colours and an ordered dither that the gradients do not band, and
    // the dither stays put between frames so still areas compress.
    run(['-i', master, '-vf', 'fps=15,scale=800:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=200:stats_mode=full[p];[b][p]paletteuse=dither=bayer:bayer_scale=4:diff_mode=rectangle',
      path.join(OUT, `${name}.gif`)]);
  }
  for (const f of fs.readdirSync(OUT).filter((f) => f.startsWith(name)).sort()) {
    console.log(`  ${path.relative(REPO, path.join(OUT, f))}  ${(fs.statSync(path.join(OUT, f)).size / 1024).toFixed(0)} KB`);
  }
  await done();
} catch (e) {
  console.error(e.message || e);
  await done(1);
}
