// The Android Dev showcase as a pure function of time: render(ms) puts the
// stage in the state it has at that moment, and scripts/showcase/render.mjs
// steps it frame by frame. Rows, strings and sizes follow the plugin's QML and
// helper (Pages.qml, BarWidget.qml, MirrorKeys.qml, Service.qml and
// bin/androiddev in CostaFot/omarchy-android-dev) on omarchy-shell's defaults
// and the Tokyo Night theme; the notifications are omarchy-shell's own card.
// The phone and its serial are made up; the posts in its feed are this site's.
//
// The desktop is 1280x720 and a camera frames it: close on the droid at the
// start and the end (the loop's seam, and the poster), pulled back while
// things happen. The keys pressed show in the corner, the way a screencast
// key display draws them.

const W = 800, H = 450, DW = 1280, DH = 720, BAR = 26;
window.VIEWPORT = { width: W, height: H, scale: 2 };
const $ = (id) => document.getElementById(id);
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const E = {
  linear: (t) => t,
  outCubic: (t) => 1 - Math.pow(1 - t, 3),
  outQuint: (t) => 1 - Math.pow(1 - t, 5),
  inOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
};

function mulberry32(a) {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// A value over time: jumps and tweens, authored in time order.
class Track {
  constructor(v0) { this.v0 = v0; this.last = v0; this.segs = []; }
  set(t, v) { this.segs.push({ t0: t, t1: t, from: v, to: v, ease: E.linear }); this.last = v; return this; }
  to(t0, t1, v, ease = E.linear) { this.segs.push({ t0, t1, from: this.last, to: v, ease }); this.last = v; return this; }
  at(t) {
    let s = null;
    for (const g of this.segs) { if (g.t0 <= t) s = g; else break; }
    if (!s) return this.v0;
    if (t >= s.t1) return s.to;
    return s.from + (s.to - s.from) * s.ease((t - s.t0) / (s.t1 - s.t0));
  }
}

// ---- the data ----------------------------------------------------------------
// fmt.device_label and fmt.device_detail for a phone over USB.
const DEVICE = 'Pixel 9 (4A171FDAQ002T5)';
const GLYPH = '';

// The phone's feed: this site's posts, newest first, with their hero images.
const POSTS = [
  ['5 stages of (developer) grief', '27 Sep 2026'],
  ['At the mountains of madness: Interviews', '28 Jul 2026'],
  ['Remote Compose looks promising', '12 Jun 2026'],
  ["It looks like you're trying to: Build an Extension for Command Palette", '19 Apr 2026'],
  ['At the Mountains of Madness: Rewriting a 100-Line PowerShell Script as a KMP Desktop App', '5 Apr 2026'],
  ["Mogged into building a Chrome extension (Replacing 'Search with Google' with Claude)", '24 Mar 2026'],
  ['Using a GitHub file as a database cause why not', '23 Mar 2026'],
  ['Things', '16 Mar 2026'],
  ['ViewModel is deprecated*', '3 Mar 2026'],
  ['At the Mountains of Madness with Jetpack Compose', '21 Apr 2025'],
  ['Injecting Composables with Dagger without losing it', '14 May 2024'],
  ['Going edge-to-edge with Compose without losing it', '13 Mar 2024'],
  ['Exercises in futility: One-time events in Android', '20 Nov 2023'],
  ['Exercises in futility: Jetpack Compose Recomposition', '15 May 2023'],
  ['Gotchas in Per-App Language Preferences and Android Locale', '24 Apr 2023'],
];

// ---- the panel's rows (Pages.qml's row builders) --------------------------------
const act = (id, icon, label, detail = '', extra = {}) => ({ type: 'action', id, icon, label, detail, ...extra });
const note = (label, detail = '', extra = {}) => ({ type: 'note', label, detail, ...extra });

const PAGE_ROWS = [
  ['info', '', 'Device info', 'Android version, battery, network, screen, memory, storage'],
  ['packages', '', 'Apps', 'Packages, their actions and deep links'],
  ['deeplink', '', 'Deep link', 'Open a URL on the device'],
  ['toggles', '', 'Toggles', 'Animations, touches, layout bounds, airplane, Wi-Fi, data, Bluetooth, demo mode'],
  ['tweaks', '', 'Tweaks', 'Dark mode, font scale, display scale'],
  ['capture', '', 'Capture', 'Screenshot and screen recording'],
  ['apks', '', 'APKs', 'Install from a folder'],
  ['text', '', 'Send text', 'Type text or the clipboard on the device'],
  ['tools', '', 'Tools', 'scrcpy, emulators, logcat'],
  ['wireless', '', 'Wireless', 'Pair and connect over Wi-Fi, go cable-free'],
  ['settings', '', 'Settings', '~/Android/Sdk/platform-tools/adb · found in ~/Android/Sdk'],
];

function hubRows(s) {
  const out = [];
  if (s.device) out.push(act('dev', GLYPH, DEVICE, 'USB · ready'));
  else out.push(act('dev', GLYPH, 'No device', 'Connect a device or start an emulator'));
  out.push({ type: 'sep' });
  for (const [id, icon, label, detail] of PAGE_ROWS) out.push(act(id, icon, label, detail));
  out.push(act('openwindow', '', 'Open as a window', 'The same pages as a window; this popup closes'));
  return out;
}

function toolRows(s) {
  if (!s.read) return [note('Reading the tools…')];
  return [
    act('scrcpy', '', 'Mirror with scrcpy', 'over USB · scrcpy -s <serial> --window-title "Android Dev"'),
    act('logcat', '', 'Logcat', 'adb logcat in a terminal'),
    { type: 'header', label: 'Emulators' },
    act('avd1', '', 'Medium_Phone', 'Stopped · Enter starts it, quick or cold'),
    act('avd2', '', 'Pixel_10_Pro_Fold', 'Stopped · Enter starts it, quick or cold'),
  ];
}

// toggleOrder, toggleCommands and the helper's labels; the states are the
// README's screenshot of them, Layout bounds flipping.
const TOGGLES = [
  ['animations', 'Animations', true, 'settings put global *_animation_scale 0|1'],
  ['touches', 'Show touches', false, 'settings put system show_touches'],
  ['pointer', 'Pointer location', false, 'settings put system pointer_location'],
  ['layout', 'Layout bounds', false, 'setprop debug.layout, then a poke at the activity service'],
  ['airplane', 'Airplane mode', false, 'cmd connectivity airplane-mode (settings put + broadcast before API 30)'],
  ['wifi', 'Wi-Fi', true, 'svc wifi enable|disable'],
  ['data', 'Mobile data', true, 'svc data enable|disable'],
  ['bluetooth', 'Bluetooth', true, 'svc bluetooth enable|disable'],
  ['demo', 'Demo mode', false, 'am broadcast systemui.demo enter|exit'],
];

function toggleRows(s) {
  if (!s.read) return [note('Reading the toggles…')];
  return TOGGLES.map(([id, label, on0, cmd]) => {
    const on = id === 'layout' ? s.layout : on0;
    return act(id, on ? '' : '', label, `${on ? 'on' : 'off'} · ${cmd}`);
  });
}

const TITLES = { tools: 'Tools', toggles: 'Toggles' };
const HINTS = {
  hub: 'j/k move · Enter opens · r refreshes · Esc closes',
  tools: 'j/k move · Enter runs it · r reads again · Esc back',
  toggles: 'j/k move · Enter flips · r reads again · Esc back',
};

function rowsFor(s, t) {
  const out = [];
  if (s.page !== 'hub') out.push({ type: 'title', label: TITLES[s.page] });
  out.push(...(s.page === 'hub' ? hubRows(s) : s.page === 'tools' ? toolRows(s) : toggleRows(s)));
  // The store's notice, shown for three seconds (Store.qml's noticeTimer).
  if (s.notice && t < s.noticeT + 3000) out.push({ type: 'sep' }, note(s.notice));
  out.push({ type: 'footer', label: HINTS[s.page] });
  return out;
}

function rowHtml(r, sel) {
  const selCls = r.id && r.id === sel ? ' sel' : '';
  switch (r.type) {
    case 'sep': return '<div class="row sep"></div>';
    case 'title': return `<div class="row title"><span class="back">‹</span><span class="t">${esc(r.label)}</span></div>`;
    case 'header': return `<div class="row header">${esc(r.label)}</div>`;
    case 'footer': return `<div class="row footer t">${esc(r.label)}</div>`;
    case 'note': return `<div class="row note"><div>${esc(r.label)}</div>${r.detail ? `<div class="det">${esc(r.detail)}</div>` : ''}</div>`;
    case 'action':
      return `<div class="row action${r.urgent ? ' urgent' : ''}${selCls}" data-id="${r.id}" style="height:${r.detail ? 44 : 32}px">` +
        `<span class="ico">${esc(r.icon)}</span><div class="col"><div class="t">${esc(r.label)}</div>` +
        `${r.detail ? `<div class="det t">${esc(r.detail)}</div>` : ''}</div></div>`;
  }
  return '';
}

// ---- the timeline ----------------------------------------------------------------
const events = [];
const at = (t, f) => events.push({ t, f });
const keys = [];   // { t, label, kind: 'key' | 'chord' | 'mouse' }
const rings = [];  // { t, x, y }
const notes = [];  // { t, summary, body, life }
const cam = { s: new Track(1), cx: new Track(0), cy: new Track(0) };
const OFF = [1200, 820];
const cx = new Track(OFF[0]), cy = new Track(OFF[1]);
const scroll = new Track(0);
const T = {};
// omarchy-notification-send defaults to low urgency: five seconds on screen.
const LIFE = 5000;
const notify = (t, summary, body) => { const n = { t, summary, body, life: LIFE }; notes.push(n); return n; };
// When a card leaves: its time runs out, or it is dismissed.
const noteEnd = (n) => (n.gone !== undefined ? n.gone : n.t + n.life);

function build(geo) {
  const A = { s: 2.2, cx: geo.droidCx - 40, cy: 0 };
  const A2 = { s: 1.35, cx: 1000, cy: 0 };
  const hubLow = { s: 1, cx: 880, cy: DH };
  const top = { s: 1, cx: 880, cy: 0 };
  const REC = { s: 0.9, cx: 836, cy: 0 };
  for (const k of ['s', 'cx', 'cy']) cam[k].v0 = cam[k].last = A[k];
  const move = (t0, t1, to) => {
    cam.s.to(t0, t1, to.s, E.inOutCubic); cam.cx.to(t0, t1, to.cx, E.inOutCubic); cam.cy.to(t0, t1, to.cy, E.inOutCubic);
  };
  const key = (t, label, kind = 'key') => keys.push({ t, label, kind });
  const page = (t, name, readAfter = 0) => {
    at(t, (s) => { s.page = name; s.read = readAfter === 0; s.sel = null; });
    if (readAfter) at(t + readAfter, (s) => { s.read = true; });
  };

  // A phone is plugged in: the tracker sees it, the droid lights up, and the
  // service notifies (Service.qml's notifyDevices).
  T.connect = 600;
  at(T.connect, (s) => { s.device = true; s.lightT = T.connect; });
  notify(T.connect + 80, 'Android device connected', DEVICE);
  move(700, 1700, A2);

  // SUPER + ALT + A, the README's binding: the hub, the cursor on its first row.
  T.open = 2700;
  keys.push({ t: T.open, label: ['Super', 'Alt', 'A'], kind: 'chord' });
  at(T.open, (s) => { s.open = true; s.openT = T.open; s.page = 'hub'; s.read = true; s.sel = 'dev'; });
  move(2850, 3750, hubLow);

  // k wraps to the bottom and climbs to Tools.
  const hubIds = ['dev', ...PAGE_ROWS.map((r) => r[0]), 'openwindow'];
  const walk = (t0, from, steps, dir, gap = 150) => {
    let i = hubIds.indexOf(from);
    for (let n = 0; n < steps; n++) {
      i = (i + dir + hubIds.length) % hubIds.length;
      const id = hubIds[i], t = t0 + n * gap;
      key(t, dir > 0 ? 'j' : 'k');
      at(t, (s) => { s.sel = id; });
    }
  };
  walk(3500, 'dev', 4, -1);
  key(4450, 'Enter');
  page(4450, 'tools', 280);
  at(4730, (s) => { s.sel = 'scrcpy'; });
  move(4450, 5250, top);

  // Enter on Mirror with scrcpy: the helper launches it detached and says so;
  // the window comes up a moment later, floated and centred, and the strip of
  // keys lands along its right edge.
  T.mirror = 5900;
  key(T.mirror, 'Enter');
  at(T.mirror + 150, (s) => { s.notice = `scrcpy started: ${DEVICE}`; s.noticeT = T.mirror + 150; });
  notify(T.mirror + 180, `scrcpy started: ${DEVICE}`, DEVICE);
  T.win = T.mirror + 650;
  T.strip = T.win + 180;

  // Esc back to the hub, the cursor back on Tools; k up to Toggles.
  key(7300, 'Esc');
  at(7300, (s) => { s.page = 'hub'; s.sel = 'tools'; });
  walk(7650, 'tools', 5, -1, 140);
  key(8550, 'Enter');
  page(8550, 'toggles', 300);
  at(8850, (s) => { s.sel = 'animations'; });
  ['touches', 'pointer', 'layout'].forEach((id, n) => { key(9250 + n * 170, 'j'); at(9250 + n * 170, (s) => { s.sel = id; }); });

  // Enter flips Layout bounds: the row, the notice, the notification, and
  // the phone redraws every view with its bounds.
  T.layout = 10000;
  key(T.layout, 'Enter');
  at(T.layout + 250, (s) => { s.layout = true; s.notice = 'Layout bounds on'; s.noticeT = T.layout + 250; });
  notify(T.layout + 280, 'Layout bounds on', DEVICE);
  T.bounds = T.layout + 330;

  // Esc, Esc: the hub, then closed.
  key(12100, 'Esc');
  at(12100, (s) => { s.page = 'hub'; s.sel = 'toggles'; });
  T.close = 12500;
  key(T.close, 'Esc');
  at(T.close, (s) => { s.open = false; s.openT = T.close; });
  move(T.close + 100, T.close + 1000, REC);

  // The strip's Record key: screenrecord starts on the phone, the droid goes
  // red with a dot and the key lights up.
  const rec = geo.recordKey;
  cx.to(12700, 13500, rec[0], E.inOutCubic); cy.to(12700, 13500, rec[1], E.inOutCubic);
  T.recClick = 13700;
  rings.push({ t: T.recClick, x: rec[0], y: rec[1] });
  key(T.recClick, 'Left click', 'mouse');
  T.recStart = T.recClick + 350;
  at(T.recStart, (s) => { s.recording = true; s.recT = T.recStart; });
  notify(T.recStart + 30, 'Recording the Android screen', DEVICE);

  // Something to record: a swipe up the feed, and the fling carries on.
  const p0 = [geo.phoneX + 205, geo.phoneY + 385], p1 = [geo.phoneX + 205, geo.phoneY + 175];
  cx.to(14200, 14900, p0[0], E.inOutCubic); cy.to(14200, 14900, p0[1], E.inOutCubic);
  T.press = 15050; T.release = 15650;
  key(T.press, 'Left drag', 'mouse');
  cx.to(T.press, T.release, p1[0], E.inOutCubic); cy.to(T.press, T.release, p1[1], E.inOutCubic);
  scroll.to(T.press, T.release, p0[1] - p1[1], E.inOutCubic).to(T.release, T.release + 700, p0[1] - p1[1] + 120, E.outCubic);

  // Record again stops it: the droid goes back, the mp4 is pulled into ~/Videos.
  cx.to(16100, 16800, rec[0], E.inOutCubic); cy.to(16100, 16800, rec[1], E.inOutCubic);
  T.stopClick = 17000;
  rings.push({ t: T.stopClick, x: rec[0], y: rec[1] });
  key(T.stopClick, 'Left click', 'mouse');
  at(T.stopClick + 120, (s) => { s.recording = false; s.recT = T.stopClick + 120; });
  const saved = notify(T.stopClick + 700, 'Android screen recording saved', '~/Videos/android-2026-09-27_21-14-20.mp4');

  // The cable comes out: scrcpy exits with the device, the strip goes with
  // it, the droid dims and the service says so.
  T.unplug = 18600;
  at(T.unplug, (s) => { s.device = false; s.lightT = T.unplug; });
  T.winOut = T.unplug + 60;
  const bye = notify(T.unplug + 80, 'Android device disconnected', DEVICE);

  // A right click dismisses a card (NotificationCard.qml): the top one, then
  // the one that moves up under the cursor.
  const card = [DW - 10 - 40, 36 + 32];
  cx.to(18800, 19550, card[0], E.inOutCubic); cy.to(18800, 19550, card[1], E.inOutCubic);
  [[19750, bye], [20350, saved]].forEach(([t, n]) => {
    rings.push({ t, x: card[0], y: card[1] });
    key(t, 'Right click', 'mouse');
    n.gone = t + 60;
  });

  // Out of the way, and the camera goes back in on the droid.
  cx.to(20700, 21500, OFF[0], E.inOutCubic); cy.to(20700, 21500, OFF[1], E.inOutCubic);
  const lastOut = Math.max(...notes.map(noteEnd)) + 160;
  move(20600, 21900, A);
  window.DURATION = Math.max(lastOut, 21900) + 250;
}

function stateAt(t) {
  const s = {
    device: false, lightT: -1e9, open: false, openT: -1e9, page: 'hub', read: true, sel: null,
    notice: '', noticeT: -1e9, layout: false, recording: false, recT: -1e9,
  };
  for (const e of events) if (e.t <= t) e.f(s);
  return s;
}

// ---- layout bounds ---------------------------------------------------------------
// ViewGroup.onDebugDraw, as the phone draws it for every view with the flag on:
// a red outline on each view and blue corners 8 dp long, 1 dp thick.
let BOXES = null;
function measureBoxes() {
  const phone = $('phone'), pr = phone.getBoundingClientRect();
  const rel = (el) => { const r = el.getBoundingClientRect(); return { x: r.left - pr.left, y: r.top - pr.top, w: r.width, h: r.height }; };
  const fixed = [], listed = [];
  const sel = '#sbar, #sbar > span, #sbar .si, #appbar, #appbar .title, #appbar .act, #listport, #nav, #nav .tab, #nav .pill, #nav .tab > span, #handle';
  for (const el of phone.querySelectorAll(sel)) fixed.push(rel(el));
  for (const el of phone.querySelectorAll('.item, .item .thumb, .item .txt, .item .ttl, .item .sub')) listed.push(rel(el));
  BOXES = { fixed, listed, port: rel($('listport')) };
}

let lastBounds = '';
function drawBounds(on, sy) {
  const k = on ? `on:${sy.toFixed(2)}` : 'off';
  if (k === lastBounds) return;
  lastBounds = k;
  const cv = els.bounds, ctx = cv.getContext('2d');
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, cv.width, cv.height);
  if (!on) return;
  ctx.setTransform(3, 0, 0, 3, 0, 0);
  const box = (b) => {
    ctx.strokeStyle = 'rgba(255, 0, 0, 0.9)'; ctx.lineWidth = 0.7;
    ctx.strokeRect(b.x + 0.35, b.y + 0.35, b.w - 0.7, b.h - 0.7);
    ctx.fillStyle = 'rgb(63, 127, 255)';
    const L = Math.min(5.6, b.w / 2, b.h / 2), T = 0.9;
    const x0 = b.x, y0 = b.y, x1 = b.x + b.w, y1 = b.y + b.h;
    ctx.fillRect(x0, y0, L, T); ctx.fillRect(x0, y0, T, L);
    ctx.fillRect(x1 - L, y0, L, T); ctx.fillRect(x1 - T, y0, T, L);
    ctx.fillRect(x0, y1 - T, L, T); ctx.fillRect(x0, y1 - L, T, L);
    ctx.fillRect(x1 - L, y1 - T, L, T); ctx.fillRect(x1 - T, y1 - L, T, L);
  };
  const p = BOXES.port;
  ctx.save();
  ctx.beginPath(); ctx.rect(p.x, p.y, p.w, p.h); ctx.clip();
  for (const b of BOXES.listed) box({ ...b, y: b.y - sy });
  ctx.restore();
  for (const b of BOXES.fixed) box(b);
}

// ---- render ---------------------------------------------------------------------
const els = {};
let lastPanel = '', lastKeys = '', lastNotes = '', lastDroid = '', lastStrip = '';
const mix = (a, b, u) => a.map((v, i) => Math.round(v + (b[i] - v) * u));
const FG = [169, 177, 214], URGENT = [247, 118, 142];

function notesAt(t) {
  // Newest on top (popupModel.insert(0, …)); a card fades in and out over
  // 150 ms and the ones under it close the gap as it goes.
  const live = notes.filter((n) => n.t <= t && t < noteEnd(n) + 150).sort((a, b) => b.t - a.t);
  let y = 0;
  return live.map((n) => {
    const inU = E.outCubic(clamp((t - n.t) / 150, 0, 1));
    const outU = clamp((t - noteEnd(n)) / 150, 0, 1);
    const card = { n, y, o: inU * (1 - outU), dx: 16 * (1 - inU) };
    y += (64 + 8) * inU * (1 - E.outCubic(outU));
    return card;
  });
}

function render(t) {
  const s = stateAt(t);

  // Camera, clamped to the desktop.
  const sc = cam.s.at(t);
  const hw = W / 2 / sc, hh = H / 2 / sc;
  const ccx = clamp(cam.cx.at(t), hw, DW - hw), ccy = clamp(cam.cy.at(t), hh, DH - hh);
  els.cam.style.transform = `translate(${W / 2 - ccx * sc}px, ${H / 2 - ccy * sc}px) scale(${sc})`;

  // The droid: 0.45 with no device (140 ms), the urgent colour while it records (160 ms).
  const lu = E.outCubic(clamp((t - s.lightT) / 140, 0, 1));
  const op = s.device ? 0.45 + 0.55 * lu : 1 - 0.55 * lu;
  const ru = clamp((t - s.recT) / 160, 0, 1);
  const col = s.recording ? mix(FG, URGENT, ru) : mix(URGENT, FG, s.recT > 0 ? ru : 1);
  const label = GLYPH + (s.recording ? ' ●' : '');
  const dk = `${label}|${col}|${op.toFixed(3)}`;
  if (dk !== lastDroid) {
    lastDroid = dk;
    els.droidtext.textContent = label;
    els.droidtext.style.color = `rgb(${col})`;
    els.droidtext.style.opacity = op.toFixed(3);
  }

  // The panel and the open-panel mark under the droid: 120 and 140 ms fades.
  const since = t - s.openT;
  els.mark.style.opacity = String(0.9 * (s.open ? E.outCubic(clamp(since / 120, 0, 1)) : 1 - E.outCubic(clamp(since / 120, 0, 1))));
  const po = s.open ? E.outCubic(clamp(since / 140, 0, 1)) : 1 - E.outCubic(clamp(since / 140, 0, 1));
  els.panel.style.opacity = String(po);
  els.panel.style.visibility = po > 0 ? 'visible' : 'hidden';
  const rows = rowsFor(s, t);
  const pk = JSON.stringify([rows, s.sel]);
  if (pk !== lastPanel) { lastPanel = pk; els.list.innerHTML = rows.map((r) => rowHtml(r, s.sel)).join(''); }

  // The scrcpy window: Hyprland's popin 87% in (410 ms, easeOutQuint), out in 149 ms.
  let wo = 0, ws = 0.87;
  if (t >= T.win && t < T.winOut) {
    const u = clamp((t - T.win) / 410, 0, 1);
    wo = clamp((t - T.win) / 173, 0, 1); ws = 0.87 + 0.13 * E.outQuint(u);
  } else if (t >= T.winOut) {
    const u = clamp((t - T.winOut) / 149, 0, 1);
    wo = 1 - u; ws = 1 - 0.13 * u;
  }
  els.mirror.style.opacity = wo.toFixed(3);
  els.mirror.style.transform = `scale(${ws.toFixed(4)})`;
  els.mirror.style.visibility = wo > 0 ? 'visible' : 'hidden';
  els.listin.style.transform = `translateY(${(-scroll.at(t)).toFixed(2)}px)`;
  drawBounds(t >= T.bounds, scroll.at(t));

  // The strip follows the window: it shows once Hyprland reports the client, and goes with it.
  const so = t >= T.strip && t < T.winOut ? clamp((t - T.strip) / 120, 0, 1) : 0;
  els.strip.style.opacity = so.toFixed(3);
  els.strip.style.visibility = so > 0 ? 'visible' : 'hidden';
  const px = cx.at(t), py = cy.at(t);
  const downKey = [T.recClick, T.stopClick].some((c) => t >= c - 60 && t < c + 110);
  let sk = '';
  for (const k of STRIP_KEYS) {
    if (k.sep) continue;
    const r = k.rect, over = px >= r.x && px < r.x + r.w && py >= r.y && py < r.y + r.h;
    const cls = (over ? (downKey ? ' down' : ' hover') : '') + (k.key === 'record' && s.recording ? ' lit' : '');
    sk += cls + ';';
    if (k.el.dataset.cls !== cls) { k.el.dataset.cls = cls; k.el.className = 'key' + cls; }
  }

  // Notifications.
  const cards = notesAt(t);
  const nk = JSON.stringify(cards.map((c) => [c.n.t, c.y.toFixed(1), c.o.toFixed(3), c.dx.toFixed(1)]));
  if (nk !== lastNotes) {
    lastNotes = nk;
    els.notes.innerHTML = cards.map((c) =>
      `<div class="note-card" style="top:${c.y.toFixed(1)}px;opacity:${c.o.toFixed(3)};transform:translateX(${c.dx.toFixed(1)}px)">` +
      `<div class="g">${GLYPH}</div><div class="tx"><div class="s">${esc(c.n.summary)}</div><div class="b">${esc(c.n.body)}</div></div></div>`).join('');
  }

  // Click rings.
  let r = null;
  for (const k of rings) if (k.t <= t && t < k.t + 420) r = k;
  if (r) {
    const v = (t - r.t) / 420, d = 10 + 34 * E.outCubic(v);
    Object.assign(els.ring.style, { opacity: String(1 - v), width: `${d}px`, height: `${d}px`, left: `${r.x - d / 2}px`, top: `${r.y - d / 2}px` });
  } else els.ring.style.opacity = '0';

  // Cursor: the hand over the strip's keys and over a card, the arrow elsewhere.
  const overKey = so > 0.5 && STRIP_KEYS.some((k) => !k.sep && px >= k.rect.x && px < k.rect.x + k.rect.w && py >= k.rect.y && py < k.rect.y + k.rect.h);
  const overCard = cards.some((c) => c.o > 0.5 && px >= DW - 10 - 380 && px < DW - 10 && py >= 36 + c.y && py < 36 + c.y + 64);
  const img = overKey || overCard ? 'pointer' : 'default', hot = HOT[img];
  if (els.cursor.dataset.img !== img) { els.cursor.src = `/cursors/${img}.png`; els.cursor.dataset.img = img; }
  els.cursor.style.transform = `translate(${px - hot[0]}px, ${py - hot[1]}px)`;

  // Keys: the latest group, held 1.4 s after its last key, then a 300 ms fade.
  let g = null;
  for (const k of keys) {
    if (k.t > t) break;
    const joins = g && k.t - g.last < 900 && k.kind === 'key' && g.kind === 'key' && g.keys[0].label === k.label;
    if (joins) { g.keys.push(k); g.last = k.t; } else g = { kind: k.kind, keys: [k], last: k.t };
  }
  let ko = 0, html = '';
  if (g) {
    ko = 1 - clamp((t - g.last - 1400) / 300, 0, 1);
    const chips = g.kind === 'chord' ? g.keys[0].label.map((label) => ({ t: g.keys[0].t, label, kind: 'key' })) : g.keys;
    html = chips.map((k) => {
      const pop = clamp((t - k.t) / 90, 0, 1);
      const face = k.kind === 'mouse' ? `<span class="m">\u{f037d}</span>${esc(k.label)}` : esc(k.label);
      return `<span class="k" style="opacity:${pop.toFixed(2)};transform:scale(${(0.85 + 0.15 * E.outCubic(pop)).toFixed(3)})">${face}</span>`;
    }).join('');
  }
  if (html !== lastKeys) { lastKeys = html; els.keys.innerHTML = html; }
  els.keys.style.opacity = String(ko);
}
// Adwaita's hotspots at 96 px (/cursors/<name>.json), drawn at 32.
const HOT = { default: [12 * 32 / 96, 4 * 32 / 96], pointer: [28 * 32 / 96, 20 * 32 / 96] };

// MirrorKeys.qml's keyRows.
const STRIP_KEYS = [
  { key: 'back', glyph: '' }, { key: 'home', glyph: '' }, { key: 'recents', glyph: '' }, { sep: true },
  { key: 'volup', glyph: '' }, { key: 'voldown', glyph: '' }, { key: 'power', glyph: '' }, { sep: true },
  { key: 'screenshot', glyph: '' }, { key: 'record', glyph: '' },
];

window.ready = (async () => {
  for (const n of ['cam', 'droidtext', 'mark', 'mirror', 'phone', 'listin', 'bounds', 'strip', 'panel', 'list', 'notes', 'ring', 'cursor', 'keys']) els[n] = $(n);
  // Stars, the same every time, drawn at 3x so the camera's zoom keeps them round.
  const rnd = mulberry32(7), sc = $('stars'), sx = sc.getContext('2d');
  sc.width = DW * 3; sc.height = DH * 3; sx.scale(3, 3);
  for (let i = 0; i < 110; i++) {
    const x = rnd() * DW, y = BAR + rnd() * (DH - BAR), r = rnd() < 0.15 ? 1.2 : 0.7, a = 0.2 + rnd() * 0.5;
    sx.fillStyle = `rgba(255, 255, 255, ${a.toFixed(2)})`;
    sx.beginPath(); sx.arc(x, y, r, 0, Math.PI * 2); sx.fill();
  }

  // The phone's feed.
  els.listin.innerHTML = POSTS.map(([title, date], i) =>
    `<div class="item"><div class="thumb"><img src="thumbs/${i + 1}.jpg" alt=""></div>` +
    `<div class="txt"><div class="ttl">${esc(title)}</div><div class="sub">${esc(date)}</div></div></div>`).join('');
  els.bounds.width = 288 * 3; els.bounds.height = 640 * 3;

  // The strip's keys.
  els.strip.innerHTML = STRIP_KEYS.map((k) => (k.sep ? '<div class="sep"></div>' : `<div class="key">${k.glyph}</div>`)).join('');

  const imgs = [...document.images].map((i) => i.decode().catch(() => {}));
  await Promise.all([...imgs, ...['/cursors/default.png', '/cursors/pointer.png'].map((src) => { const i = new Image(); i.src = src; return i.decode().catch(() => {}); })]);
  await document.fonts.ready;

  // Place things. The panel centres on the droid 5 px under the bar, kept
  // 5 px off the screen edge (KeyboardPanel); the mirror floats centred
  // (the README's window rule); the strip sits 6 px off its right edge, top-aligned.
  const droid = $('droid');
  const droidX = droid.getBoundingClientRect().left, droidW = droid.offsetWidth, droidCx = droidX + droidW / 2;
  const panelW = 412;
  els.panel.style.left = `${clamp(Math.round(droidCx - panelW / 2), 5, DW - panelW - 5)}px`;
  els.panel.style.top = `${BAR + 5}px`;
  const mw = 288 + 4, mh = 640 + 4;
  const mx = Math.round((DW - mw) / 2), my = Math.round(BAR + (DH - BAR - mh) / 2);
  Object.assign(els.mirror.style, { left: `${mx}px`, top: `${my}px` });
  const stx = mx + mw + 6, sty = my;
  Object.assign(els.strip.style, { left: `${stx}px`, top: `${sty}px` });
  measureBoxes();
  const keyEls = [...els.strip.children];
  STRIP_KEYS.forEach((k, i) => {
    k.el = keyEls[i];
    k.rect = { x: stx + k.el.offsetLeft, y: sty + k.el.offsetTop, w: k.el.offsetWidth, h: k.el.offsetHeight };
  });
  const rk = STRIP_KEYS.find((k) => k.key === 'record').rect;
  build({ droidCx, phoneX: mx + 2, phoneY: my + 2, recordKey: [rk.x + rk.w / 2, rk.y + rk.h / 2] });
  lastPanel = lastKeys = lastNotes = lastDroid = lastStrip = lastBounds = '';
  render(0);
  return window.DURATION;
})();
window.render = render;

// Scrub in a browser: ?t=12.5 freezes there, ?play plays it in real time.
const qs = new URLSearchParams(location.search);
window.ready.then(() => {
  if (qs.has('t')) render(parseFloat(qs.get('t')) * 1000);
  if (qs.has('play')) {
    const t0 = performance.now();
    const tick = (now) => { render((now - t0) % window.DURATION); requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
  }
});
