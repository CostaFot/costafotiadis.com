// The Markets showcase as a pure function of time: render(ms) puts the stage in
// the state it has at that moment, and scripts/showcase/render.mjs steps it
// frame by frame. Rows, strings and sizes follow the plugin's QML (Panel.qml,
// BarWidget.qml, Chart.qml in CostaFot/omarchy-markets) on omarchy-shell's
// defaults and the Tokyo Night theme; the prices are made up. The search
// results for "apple" are the ones the README's screenshot shows.
//
// The desktop is 1280x720 and a camera frames it: close on the strip at the
// start and the end (the loop's seam, and the poster), pulled back while the
// panel is up. The keys pressed show in the corner, the way a screencast
// key display draws them.

const W = 800, H = 450, DW = 1280, DH = 720, BAR = 26;
window.VIEWPORT = { width: W, height: H, scale: 2 };
const $ = (id) => document.getElementById(id);
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const E = {
  linear: (t) => t,
  outCubic: (t) => 1 - Math.pow(1 - t, 3),
  inOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  inOutSine: (t) => -(Math.cos(Math.PI * t) - 1) / 2,
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
// The favorites in the strip, as the helper formats them (fmt.strip_value_text).
// A poll lands a second in and gives SOL its one green moment; the middle
// click at the end takes it back, which is also where the loop starts.
const STRIPS = {
  p0: [
    { label: 'BTC', value: '$77,260 ▼ -0.2%', dir: 'down' },
    { label: 'ETH', value: '$2,389 ▼ -1.2%', dir: 'down' },
    { label: 'SOL', value: '$99.95 ▼ -0.1%', dir: 'down' },
  ],
  p1: [
    { label: 'BTC', value: '$77,318 ▼ -0.1%', dir: 'down' },
    { label: 'ETH', value: '$2,394 ▼ -1.0%', dir: 'down' },
    { label: 'SOL', value: '$100.37 ▲ +0.3%', dir: 'up' },
  ],
};
const COLORS = { up: [158, 206, 106], down: [247, 118, 142], flat: [169, 177, 214] };

// Search results for "apple": the README's screenshot, in its order.
const RESULTS = [
  ['AAPL', 'Apple Inc.', 'Stock'],
  ['AAPLX', 'Apple xStock', 'Crypto'],
  ['APLE', 'Apple Hospitality REIT, Inc.', 'Stock'],
  ['AAPLON', 'Apple (Ondo Tokenized Stock)', 'Crypto'],
  ['APC.DE', 'Apple Inc.', 'Stock'],
  ['AAPLB', 'Apple (bStocks Tokenized Stock)', 'Crypto'],
  ['AAPI', 'Apple iSports Group, Inc.', 'Stock'],
  ['AAPL', 'Apple • Robinhood Token', 'Crypto'],
  ['AAPL19.BK', 'Apple Inc.', 'Stock'],
  ['AAPLC', 'Apple (Coinbase Tokenized Stock)', 'Crypto'],
  ['AAPL.SN', 'Apple Inc.', 'Stock'],
  ['RAAPL', 'Apple (Reality Protocol)', 'Crypto'],
  ['APRU', 'Apple Rush Company, Inc.', 'Stock'],
];

// AAPL's day: 5-minute closes from the open to the close, a bridge from the
// open to the last price with some wander, seeded so it is the same every run.
const AAPL = { price: 324.96, prevClose: 325.13 };
const money = (v) => '$' + v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
function aaplDay() {
  const rnd = mulberry32(20260924), n = 78, open = 325.42;
  const gauss = () => { let s = 0; for (let i = 0; i < 6; i++) s += rnd(); return s - 3; };
  const walk = [0];
  let v = 0;
  for (let i = 1; i <= n; i++) { v = v * 0.55 + gauss() * 0.23; walk.push(walk[i - 1] + v); }
  const pts = walk.map((w, i) => {
    const bridge = w - (i / n) * walk[n];
    return +(open + (AAPL.price - open) * (i / n) + bridge).toFixed(2);
  });
  pts[n] = AAPL.price;
  const lo = Math.min(...pts), hi = Math.max(...pts), first = pts[0], last = pts[n];
  const change = last - first, pct = (change / first) * 100;
  return {
    points: pts, lo, hi,
    minText: money(lo), maxText: money(hi), prevText: money(AAPL.prevClose),
    first: '14:30', last: '21:00', dir: last >= first ? 'up' : 'down',
    rangeText: `${last >= first ? '▲' : '▼'} ${change < 0 ? '-' : '+'}${money(Math.abs(change))} (${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%) · 1D`,
  };
}
let SERIES = null;

// ---- the panel's rows (Panel.qml's row builders) --------------------------------
const act = (id, icon, label, detail = '', extra = {}) => ({ type: 'action', id, icon, label, detail, ...extra });
const note = (label, detail = '') => ({ type: 'note', label, detail });

function hubRows(s) {
  return [
    act('hub-search', '', 'Search', 'Look up a stock, crypto or currency'),
    act('hub-watch', '', 'Watchlist', `${s.watch ? 9 : 8} tracked`),
    act('hub-fav', '★', 'Favorites', '3 starred, shown in the bar'),
    act('hub-pf', '', 'Portfolio', '$40,742.41  ▼ -$22.59 (-0.06%) today'),
    act('hub-news', '', 'News', 'Coming in a later version', { muted: true }),
    act('hub-src', '', 'Data sources', 'Who prices what'),
    act('hub-set', '', 'Settings', 'Favorites · every 10 min'),
  ];
}

function searchRows(s) {
  const q = s.field.trim();
  if (!q) return [note('Type a symbol or a name, then press Enter.', 'AAPL, HSBA.L, ^GSPC, EURUSD, doge…')];
  const out = [act('search-go', '', `Search markets for "${q}"`, s.searching ? 'Searching…' : 'Enter to search')];
  if (s.searched === q) {
    out.push({ type: 'sep' }, { type: 'header', label: 'Results' });
    RESULTS.forEach(([sym, name, cat], i) => out.push({
      type: 'inst', id: `res-${i}`, label: `${sym} · ${name}`, detail: 'Enter for details', price: cat, change: '', dir: '',
    }));
    out.push({ type: 'attr', label: 'Data by Yahoo Finance' }, { type: 'attr', label: 'Data by CoinGecko' });
  }
  return out;
}

function detailRows(s) {
  const out = [{
    type: 'hero', symbol: 'AAPL', name: 'Apple Inc.', valid: s.priced,
    price: s.priced ? money(AAPL.price) : '—', change: s.priced ? '▼ -0.05%' : '', dir: 'down',
    caption: s.priced ? 'Stock · USD' : 'Pricing…',
  }];
  out.push({ type: 'chart', loaded: s.chart });
  out.push({ type: 'tabs', range: '1D' }, { type: 'sep' });
  if (!s.priced) {
    out.push(note('Pricing AAPL…', 'Add appears once a provider answers for it.'));
    return out;
  }
  out.push(act('act-watch', s.watch ? '' : '', s.watch ? 'Remove from watchlist' : 'Add to watchlist'));
  out.push(act('act-fav', '☆', 'Add to favorites', 'Favorites are what the bar strip shows'));
  out.push(act('act-pf', '', 'Add to portfolio', 'How much you hold and, if you like, what you paid'));
  return out;
}

const HINTS = {
  hub: 'j/k move · Enter opens · r refreshes · Esc closes',
  search: 'Enter searches, then opens · Tab to the list · Esc back',
  detail: '←/→ or 1–5 range · Enter applies · r refreshes · Esc back',
};

function rowsFor(s) {
  const out = [];
  if (s.page !== 'hub') out.push({ type: 'title', label: s.page === 'detail' ? 'AAPL' : 'Search' });
  out.push(...(s.page === 'hub' ? hubRows(s) : s.page === 'search' ? searchRows(s) : detailRows(s)));
  if (s.notice) out.push({ type: 'sep' }, { type: 'note', label: s.notice, plain: true });
  if (s.page !== 'search') {
    out.push({ type: 'sep' }, { type: 'attr', label: 'Data by Yahoo Finance' }, { type: 'attr', label: 'Data by CoinGecko' });
    out.push({ type: 'footer', label: 'Updated 21:12' });
  }
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
    case 'attr': return `<div class="row attr"><span class="t">${esc(r.label)}</span></div>`;
    case 'note': return `<div class="row note"><div class="lab">${esc(r.label)}</div>${r.detail ? `<div class="det">${esc(r.detail)}</div>` : ''}</div>`;
    case 'action':
      return `<div class="row action${r.muted ? ' muted' : ''}${selCls}" style="height:${r.detail ? 44 : 32}px">` +
        `<span class="ico">${esc(r.icon)}</span><div class="col"><div class="t">${esc(r.label)}</div>` +
        `${r.detail ? `<div class="det t">${esc(r.detail)}</div>` : ''}</div></div>`;
    case 'inst':
      return `<div class="row inst${selCls}" style="height:${r.detail ? 44 : 32}px"><span class="star"></span>` +
        `<div class="col"><div class="t">${esc(r.label)}</div>${r.detail ? `<div class="det t">${esc(r.detail)}</div>` : ''}</div>` +
        `<div class="val"><span>${esc(r.price)}</span>${r.change ? `<span class="${r.dir}">${esc(r.change)}</span>` : ''}</div></div>`;
    case 'hero':
      return `<div class="row hero"><div class="sym">${esc(r.symbol)}</div><div class="name">${esc(r.name)}</div><div class="gap"></div>` +
        `<div class="line"><span class="price"${r.valid ? '' : ' style="color:var(--muted)"'}>${esc(r.price)}</span>` +
        `${r.change ? `<span class="chg ${r.dir}">${esc(r.change)}</span>` : ''}</div><div class="cap">${esc(r.caption)}</div></div>`;
    case 'chart': {
      const S = SERIES;
      const labels = r.loaded
        ? `<span class="pl" data-k="max">${esc(S.maxText)}</span><span class="pl" data-k="min">${esc(S.minText)}</span><span class="pl" data-k="prev">${esc(S.prevText)}</span>`
        : '<div class="wait">…</div>';
      return `<div class="row chart"><div><div class="plot"><canvas></canvas>${labels}</div>` +
        `${r.loaded ? `<div class="stamps"><span>${S.first}</span><span>${S.last}</span></div>` : ''}</div>` +
        (r.loaded ? `<div class="rng ${S.dir}">${esc(S.rangeText)}</div>` : '<div class="cnote">Loading 1D…</div>') + '</div>';
    }
    case 'tabs':
      return '<div class="row tabs">' + ['1D', '1W', '1M', '1Y', '5Y'].map((k) => `<span class="${k === r.range ? 'on' : ''}">${k}</span>`).join('') + '</div>';
  }
  return '';
}

// Chart.qml's paint: the grid, the fill, the dashed previous close, the line.
function drawChart(plot, loaded) {
  const cv = plot.querySelector('canvas');
  const w = 364, h = 121, pad = 6, dpr = 3;
  cv.width = w * dpr; cv.height = h * dpr;
  const ctx = cv.getContext('2d');
  ctx.scale(dpr, dpr);
  const innerW = w - 2 * pad, innerH = h - 2 * pad;
  ctx.lineWidth = 1;
  ctx.strokeStyle = 'rgba(169, 177, 214, 0.18)';
  ctx.beginPath();
  for (const f of [0, 0.25, 0.5, 0.75, 1]) {
    const y = Math.round(pad + innerH * f) + 0.5, x = Math.round(pad + innerW * f) + 0.5;
    ctx.moveTo(pad, y); ctx.lineTo(w - pad, y);
    ctx.moveTo(x, pad); ctx.lineTo(x, h - pad);
  }
  ctx.stroke();
  if (!loaded) return;
  const S = SERIES, n = S.points.length - 1;
  const yFor = (v) => pad + innerH * (1 - (v - S.lo) / (S.hi - S.lo));
  const xs = S.points.map((_, i) => pad + (innerW * i) / n), ys = S.points.map(yFor);
  const line = S.dir === 'down' ? COLORS.down : COLORS.up;
  const rgba = (c, a) => `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${a})`;
  const grad = ctx.createLinearGradient(0, pad, 0, pad + innerH);
  grad.addColorStop(0, rgba(line, 0.35));
  grad.addColorStop(1, rgba(line, 0.02));
  ctx.beginPath();
  ctx.moveTo(xs[0], ys[0]);
  for (let i = 1; i <= n; i++) ctx.lineTo(xs[i], ys[i]);
  ctx.lineTo(xs[n], h - pad); ctx.lineTo(xs[0], h - pad); ctx.closePath();
  ctx.fillStyle = grad; ctx.fill();
  const py = Math.round(yFor(AAPL.prevClose)) + 0.5;
  ctx.save();
  ctx.setLineDash([4, 4]);
  ctx.strokeStyle = 'rgba(169, 177, 214, 0.45)';
  ctx.beginPath(); ctx.moveTo(pad, py); ctx.lineTo(w - pad, py); ctx.stroke();
  ctx.restore();
  ctx.strokeStyle = rgba(line, 1); ctx.lineWidth = 2; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(xs[0], ys[0]);
  for (let i = 1; i <= n; i++) ctx.lineTo(xs[i], ys[i]);
  ctx.stroke();
  // The plot labels: max top right, min bottom right, previous close above its line.
  for (const pl of plot.querySelectorAll('.pl')) {
    const lh = pl.offsetHeight, k = pl.dataset.k;
    if (k === 'max') { pl.style.right = `${pad + 2}px`; pl.style.top = `${pad + 1}px`; }
    if (k === 'min') { pl.style.right = `${pad + 2}px`; pl.style.top = `${h - pad - lh - 1}px`; }
    if (k === 'prev') { pl.style.left = `${pad + 2}px`; pl.style.top = `${clamp(py - lh - 1, pad, h - pad - lh)}px`; }
  }
}

// ---- the timeline ----------------------------------------------------------------
// State changes, replayed from the start for any moment; the panel follows
// Panel.qml's stack, cursor and notice rules (see the comments at each beat).
const events = [];
const at = (t, f) => events.push({ t, f });
const keys = [];   // { t, label, kind: 'key' | 'text' | 'mouse' }
const rings = [];  // { t, x, y }
const cam = { s: new Track(1.5), cx: new Track(0), cy: new Track(0) };
const OFF = [1060, 430];
const cx = new Track(OFF[0]), cy = new Track(OFF[1]), cimg = new Track('default');
const T = {};

function build(geo) {
  const A = { s: 1.5, cx: geo.stripCx, cy: H / 2 / 1.5 };
  const B = { s: 0.9, cx: geo.panelCx, cy: 250 };
  const C = { s: 0.9, cx: geo.panelCx, cy: 335 };
  cam.cx.v0 = cam.cx.last = A.cx;
  cam.cy.v0 = cam.cy.last = A.cy;
  const move = (t0, t1, to) => {
    cam.s.to(t0, t1, to.s, E.inOutCubic); cam.cx.to(t0, t1, to.cx, E.inOutCubic); cam.cy.to(t0, t1, to.cy, E.inOutCubic);
  };
  const key = (t, label, kind = 'key') => keys.push({ t, label, kind });

  // A poll lands: the strip ticks.
  at(1100, (s) => { s.stripPrev = s.strip; s.strip = 'p1'; s.stripT = 1100; });

  // In from below, a left click on the strip: the panel opens on the hub
  // with the cursor on its first row.
  cx.to(2000, 2800, geo.clickX, E.inOutCubic); cy.to(2000, 2800, 14, E.inOutCubic);
  T.open = 3000;
  rings.push({ t: T.open, x: geo.clickX, y: 14 });
  key(T.open, 'Left click', 'mouse');
  at(T.open, (s) => { s.open = true; s.openT = T.open; s.page = 'hub'; s.sel = 'hub-search'; });
  move(3150, 4050, B);
  // Then out of the way, off the panel's right edge.
  cx.to(3500, 4300, geo.restX, E.inOutCubic); cy.to(3500, 4300, 170, E.inOutCubic);

  // Enter opens Search; the field takes the keys.
  key(5400, 'Enter');
  at(5400, (s) => { s.page = 'search'; s.sel = null; s.typeT = 5400; });
  [...'apple'].forEach((c, i) => {
    const t = 6000 + [0, 130, 250, 390, 510][i];
    key(t, c, 'text');
    // The first character adds the action row, and the cursor lands on it.
    at(t, (s) => { s.field += c; s.typeT = t; s.sel = 'search-go'; });
  });
  // Enter runs the one helper call; the cursor moves to the first result.
  key(7300, 'Enter');
  at(7300, (s) => { s.searching = true; });
  at(8000, (s) => { s.searching = false; s.searched = 'apple'; s.sel = 'res-0'; });

  // Enter opens AAPL. Not tracked yet, so it is priced on the way in, and
  // Add appears once it has a price.
  key(8900, 'Enter');
  at(8900, (s) => { s.page = 'detail'; s.sel = null; });
  at(9400, (s) => { s.priced = true; s.sel = 'act-watch'; });
  at(9700, (s) => { s.chart = true; });
  move(10500, 11300, C);

  // Enter on Add to watchlist: the row flips and the notice says so.
  key(11900, 'Enter');
  at(12150, (s) => { s.watch = true; s.notice = 'Added AAPL to the watchlist'; });

  // Escape walks back: the search as it was, then the hub (one more on the
  // watchlist), then closed. The cursor comes back to the row that opened each page.
  key(13600, 'Esc');
  at(13600, (s) => { s.page = 'search'; s.sel = 'res-0'; s.typeT = 13600; });
  move(13600, 14200, B);
  key(14300, 'Esc');
  at(14300, (s) => { s.page = 'hub'; s.sel = 'hub-search'; });
  T.close = 15000;
  key(T.close, 'Esc');
  at(T.close, (s) => { s.open = false; s.openT = T.close; });
  move(15150, 16050, A);

  // A middle click refreshes, and the green goes.
  cx.to(16100, 16800, geo.refreshX, E.inOutCubic); cy.to(16100, 16800, 13, E.inOutCubic);
  T.refresh = 17000;
  rings.push({ t: T.refresh, x: geo.refreshX, y: 13 });
  key(T.refresh, 'Middle click', 'mouse');
  at(17700, (s) => { s.stripPrev = s.strip; s.strip = 'p0'; s.stripT = 17700; });

  // Out the way he came, and the strip is where the loop started.
  cx.to(18700, 19500, OFF[0], E.inOutCubic); cy.to(18700, 19500, OFF[1], E.inOutCubic);
  window.DURATION = 20000;
}

function stateAt(t) {
  const s = {
    strip: 'p0', stripPrev: 'p0', stripT: -1e9, open: false, openT: -1e9,
    page: 'hub', sel: null, field: '', typeT: -1e9, searching: false, searched: '',
    priced: false, chart: false, watch: false, notice: '',
  };
  for (const e of events) if (e.t <= t) e.f(s);
  return s;
}

// ---- render ---------------------------------------------------------------------
const els = {};
let lastPanel = '', lastStrip = '', lastKeys = '';
const mix = (a, b, u) => a.map((v, i) => Math.round(v + (b[i] - v) * u));
function stripRuns(now, before, u) {
  return STRIPS[now].map((e, i) => {
    const c = mix(COLORS[STRIPS[before][i].dir], COLORS[e.dir], u);
    return `${i ? '<span class="sep">  ·  </span>' : ''}${e.label} <span style="color:rgb(${c})">${esc(e.value)}</span>`;
  }).join('');
}

function render(t) {
  const s = stateAt(t);

  // Camera, clamped to the desktop.
  const sc = cam.s.at(t);
  const hw = W / 2 / sc, hh = H / 2 / sc;
  const ccx = clamp(cam.cx.at(t), hw, DW - hw), ccy = clamp(cam.cy.at(t), hh, DH - hh);
  els.cam.style.transform = `translate(${W / 2 - ccx * sc}px, ${H / 2 - ccy * sc}px) scale(${sc})`;

  // Strip: coloured runs; a new value's colour fades in over 160 ms (Behavior on color).
  const runs = stripRuns(s.strip, s.stripPrev, clamp((t - s.stripT) / 160, 0, 1));
  if (runs !== lastStrip) { lastStrip = runs; els.striptext.innerHTML = runs; }

  // The open-panel mark under the strip, and the panel itself: 120 and 140 ms fades.
  const since = t - s.openT;
  els.mark.style.opacity = String(0.9 * (s.open ? E.outCubic(clamp(since / 120, 0, 1)) : 1 - E.outCubic(clamp(since / 120, 0, 1))));
  const po = s.open ? E.outCubic(clamp(since / 140, 0, 1)) : 1 - E.outCubic(clamp(since / 140, 0, 1));
  els.panel.style.opacity = String(po);
  els.panel.style.visibility = po > 0 ? 'visible' : 'hidden';

  // Panel content, rebuilt only when it changes.
  const caretOn = s.page === 'search' && ((t - s.typeT) % 1000) < 500;
  const rows = rowsFor(s);
  const key = JSON.stringify([rows, s.sel, s.page === 'search' ? s.field : null, caretOn]);
  if (key !== lastPanel) {
    lastPanel = key;
    if (s.page === 'search') {
      els.field.style.display = 'flex';
      const caret = `<span class="caret" style="visibility:${caretOn ? 'visible' : 'hidden'}"></span>`;
      els.field.innerHTML = s.field ? `<span>${esc(s.field)}</span>${caret}` : `${caret}<span class="ph">Symbol or name, then Enter</span>`;
    } else els.field.style.display = 'none';
    els.list.innerHTML = rows.map((r) => rowHtml(r, s.sel)).join('');
    const plot = els.list.querySelector('.plot');
    if (plot) drawChart(plot, s.chart);
  }

  // Click rings.
  let r = null;
  for (const k of rings) if (k.t <= t && t < k.t + 420) r = k;
  if (r) {
    const v = (t - r.t) / 420, d = 10 + 34 * E.outCubic(v);
    Object.assign(els.ring.style, { opacity: String(1 - v), width: `${d}px`, height: `${d}px`, left: `${r.x - d / 2}px`, top: `${r.y - d / 2}px` });
  } else els.ring.style.opacity = '0';

  // Cursor.
  const img = cimg.at(t), hot = HOT[img];
  if (els.cursor.dataset.img !== img) { els.cursor.src = `/cursors/${img}.png`; els.cursor.dataset.img = img; }
  els.cursor.style.transform = `translate(${cx.at(t) - hot[0]}px, ${cy.at(t) - hot[1]}px)`;

  // Keys: the latest group, held 1.4 s after its last key, then a 300 ms fade.
  let g = null;
  for (const k of keys) {
    if (k.t > t) break;
    const joins = g && k.t - g.last < 900 && k.kind !== 'mouse' && g.kind === k.kind && (k.kind === 'text' || g.keys[0].label === k.label);
    if (joins) { g.keys.push(k); g.last = k.t; } else g = { kind: k.kind, keys: [k], last: k.t };
  }
  let ko = 0, html = '';
  if (g) {
    ko = 1 - clamp((t - g.last - 1400) / 300, 0, 1);
    html = g.keys.map((k) => {
      const pop = clamp((t - k.t) / 90, 0, 1);
      const face = k.kind === 'mouse' ? `<span class="m">\u{f037d}</span>${esc(k.label)}` : esc(k.label);
      return `<span class="k" style="opacity:${pop.toFixed(2)};transform:scale(${(0.85 + 0.15 * E.outCubic(pop)).toFixed(3)})">${face}</span>`;
    }).join('');
  }
  if (html !== lastKeys) { lastKeys = html; els.keys.innerHTML = html; }
  els.keys.style.opacity = String(ko);
}
// Adwaita's hotspots at 96 px (/cursors/<name>.json), drawn at 32.
const HOT = { default: [12 * 32 / 96, 4 * 32 / 96] };

window.ready = (async () => {
  for (const n of ['cam', 'striptext', 'mark', 'panel', 'field', 'list', 'ring', 'cursor', 'keys']) els[n] = $(n);
  els.strip = $('strip');
  SERIES = aaplDay();
  // Stars, the same every time, drawn at 3x so the camera's zoom keeps them round.
  const rnd = mulberry32(7), sc = $('stars'), sx = sc.getContext('2d');
  sc.width = DW * 3; sc.height = DH * 3; sx.scale(3, 3);
  for (let i = 0; i < 110; i++) {
    const x = rnd() * DW, y = BAR + rnd() * (DH - BAR), r = rnd() < 0.15 ? 1.2 : 0.7, a = 0.2 + rnd() * 0.5;
    sx.fillStyle = `rgba(255, 255, 255, ${a.toFixed(2)})`;
    sx.beginPath(); sx.arc(x, y, r, 0, Math.PI * 2); sx.fill();
  }
  await Promise.all(['/cursors/default.png'].map((src) => { const i = new Image(); i.src = src; return i.decode().catch(() => {}); }));
  await document.fonts.ready;

  // Measure the strip as the panel opens (after the poll), to anchor the
  // panel and aim the clicks: KeyboardPanel centres on the widget, 5 px under
  // the bar, kept 5 px off the screen edge.
  els.striptext.innerHTML = stripRuns('p1', 'p1', 1);
  const stripX = els.strip.offsetLeft, stripW = els.strip.offsetWidth;
  const textX = stripX + els.striptext.offsetLeft, textW = els.striptext.offsetWidth;
  els.mark.style.left = `${els.striptext.offsetLeft}px`;
  els.mark.style.width = `${textW}px`;
  const panelW = 412, stripCx = stripX + stripW / 2;
  const panelX = clamp(Math.round(stripCx - panelW / 2), 5, DW - panelW - 5);
  els.panel.style.left = `${panelX}px`;
  els.panel.style.top = `${BAR + 5}px`;
  els.list.style.maxHeight = `${DH - BAR - 10 - 32}px`;
  build({ stripCx, panelCx: panelX + panelW / 2, clickX: textX + textW * 0.46, refreshX: textX + textW * 0.62, restX: panelX + panelW + 70 });
  lastPanel = lastStrip = lastKeys = '';
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
