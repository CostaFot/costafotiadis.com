// The Clippy showcase as a pure function of time: render(ms) puts the stage
// in the state it has at that moment, and scripts/showcase/render.mjs steps it
// frame by frame. The behaviour follows the lab port (src/pages/lab/clippy) of
// Clippy.qml: same sprite stepper, shove, wobble, dodge, fling and lob, with
// the beats choreographed instead of random. It loops: the last frame is the
// first one. The sprite sheet, agent.json and sounds are the lab's copies.

const W = 800, H = 450, BAR = 47, SIZE = 46.5, AW = 62;
window.VIEWPORT = { width: W, height: H, scale: 2 };
const $ = (id) => document.getElementById(id);
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

const E = {
  linear: (t) => t,
  outCubic: (t) => 1 - Math.pow(1 - t, 3),
  inOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  inOutSine: (t) => -(Math.cos(Math.PI * t) - 1) / 2,
  inQuad: (t) => t * t,
  outQuad: (t) => 1 - (1 - t) * (1 - t),
  inOutQuad: (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
  outBack: (t) => 1 + 2.70158 * Math.pow(t - 1, 3) + 1.70158 * Math.pow(t - 1, 2),
  outBounce: (t) => {
    const n = 7.5625, d = 2.75;
    if (t < 1 / d) return n * t * t;
    if (t < 2 / d) return n * (t -= 1.5 / d) * t + 0.75;
    if (t < 2.5 / d) return n * (t -= 2.25 / d) * t + 0.9375;
    return n * (t -= 2.625 / d) * t + 0.984375;
  },
};

function mulberry32(a) {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// A value over time: jumps, tweens and functions, authored in time order.
class Track {
  constructor(v0) { this.v0 = v0; this.last = v0; this.segs = []; }
  set(t, v) { this.segs.push({ t0: t, t1: t, from: v, to: v, ease: E.linear }); this.last = v; return this; }
  to(t0, t1, v, ease = E.linear) { this.segs.push({ t0, t1, from: this.last, to: v, ease }); this.last = v; return this; }
  fn(t0, t1, f) { this.segs.push({ t0, t1, f }); this.last = f(t1); return this; }
  at(t) {
    let s = null;
    for (const g of this.segs) { if (g.t0 <= t) s = g; else break; }
    if (!s) return this.v0;
    if (s.f) return s.f(Math.min(t, s.t1));
    if (t >= s.t1) return s.to;
    return s.from + (s.to - s.from) * s.ease((t - s.t0) / (s.t1 - s.t0));
  }
}

// ---- the sprite: ClippySprite.qml's stepper, planned ahead ----------------
let ANIMS = {};
const clips = [];
function play(anim, t0, { loop = false, exitAt = Infinity, seed = 7 } = {}) {
  const frames = ANIMS[anim].frames, last = frames.length - 1, rnd = mulberry32(seed);
  const out = [];
  let t = t0, idx = -1, frame = null;
  for (let guard = 0; guard < 4000; guard++) {
    const exiting = t >= exitAt;
    let next;
    if (!frame) next = 0;
    else if (exiting && frame.exitBranch !== undefined) next = frame.exitBranch;
    else if (frame.branching?.branches) {
      let r = rnd() * 100;
      next = idx + 1;
      for (const b of frame.branching.branches) { if (r <= b.weight) { next = b.frameIndex; break; } r -= b.weight; }
    } else next = idx + 1;
    idx = Math.min(next, last);
    frame = frames[idx];
    out.push({ t, pos: frame.images?.[0] || null });
    const d = Math.max(16, Number(frame.duration) || 100);
    if (idx === last) {
      if (loop && !exiting) { frame = null; t += d; continue; }
      out.end = t + d;
      break;
    }
    t += d;
  }
  clips.push({ t0, anim, out });
  return out.end;
}
function spriteAt(t) {
  let c = null;
  for (const k of clips) if (k.t0 <= t) c = k;
  if (!c) return [0, 0];
  let pos = [0, 0];
  for (const f of c.out) { if (f.t <= t) pos = f.pos; else break; }
  return pos;
}

// ---- tracks ---------------------------------------------------------------
const x = new Track(190), dy = new Track(0), rot = new Track(0), pivot = new Track('50% 100%'), shown = new Track(1);
const cx = new Track(850), cy = new Track(470), cimg = new Track('default');
const bubbles = [], rings = [], sounds = [], journal = [];
let grave = null;

function say(t0, t1, text, { anchor = 'actor', fadeOut = 140, replace = false } = {}) {
  bubbles.push({ t0, t1, text, anchor, fadeOut, replace });
}
function log(t, text, cls = '') { journal.push({ t, text, cls }); }
function wobble(t, dir) {
  rot.set(t, 0).to(t, t + 70, dir * 16, E.outQuad).to(t + 70, t + 210, -dir * 9, E.inOutQuad)
    .to(t + 210, t + 330, dir * 4, E.inOutQuad).to(t + 330, t + 490, 0, E.outQuad);
}

function build() {
  // Parked, then a short walk to the middle of the gap.
  play('RestPose', 0);
  play('IdleSideToSide', 500, { loop: true, exitAt: 2300, seed: 3 });
  x.to(500, 2300, 290, E.inOutSine);

  // Unprompted.
  play('Wave', 2600, { seed: 5 });
  say(2600, 6000, "It looks like you're pretending to work. Would you like help with that?");
  log(2600, 'talk: unprompted. nobody asked.');

  // The cursor comes in from the terminal and flicks across him: a slap.
  cx.to(4600, 5900, 245, E.inOutCubic); cy.to(4600, 5900, 32, E.inOutCubic);
  cx.to(6250, 6350, 405, E.linear); cy.to(6250, 6350, 29, E.linear);
  cx.to(6350, 6650, 428, E.outQuad); cy.to(6350, 6650, 40, E.outQuad);
  const slapT = 6320;
  sounds.push({ t: slapT, src: '/lab/clippy/slap-crack.mp3' });
  x.to(slapT, slapT + 380, 420, E.outCubic);
  wobble(slapT, 1);
  play('Alert', slapT);
  say(slapT, 9300, 'I have been slapped by better people. Bill Gates, once.', { replace: false });
  log(slapT, 'slap 1/10: flicked across him at 1.6 px/ms, shoved right');

  // A middle-click on his right half. He isn't there any more.
  cx.to(7800, 8600, 472, E.inOutCubic); cy.to(7800, 8600, 30, E.inOutCubic);
  const dodgeT = 9500;
  rings.push({ t: dodgeT, x: 472, y: 30 });
  sounds.push({ t: dodgeT, src: '/lab/clippy/dodge-whoosh.mp3' });
  x.to(dodgeT, dodgeT + 150, 340, E.outCubic);
  play('Alert', dodgeT, { seed: 11 });
  say(dodgeT, 12000, "Too slow. I've dodged faster deadlines.");
  log(dodgeT, "slap: middle-click. dodged. doesn't count.");

  // Hold to pick him up, drag him back, and throw.
  cx.to(10600, 11300, 372, E.inOutCubic); cy.to(10600, 11300, 30, E.inOutCubic);
  const grabT = 12500, grabOff = 32;
  cimg.set(grabT, 'grabbing');
  play('GetAttention', grabT);
  say(grabT, 14270, 'Where the fuck are we going?');
  log(grabT, 'grab: held 300 ms, picked him up. he has questions.');
  cx.to(12700, 13900, 262, E.inOutSine);
  cx.to(14150, 14270, 512, E.linear);
  const relT = 14270;
  x.fn(grabT, relT, (t) => cx.at(t) - grabOff);
  const lean = (t) => -clamp(((cx.at(t) - cx.at(t - 48)) / 48) * 32, -28, 28);
  rot.fn(grabT, relT, lean);

  // The fling: off the end of the bar and down the screen.
  const relX = cx.at(relT) - grabOff, relRot = lean(relT), flightMs = 600, landT = relT + flightMs;
  cimg.set(relT, 'default');
  cx.to(relT, relT + 420, 560, E.outQuad); cy.to(relT, relT + 420, 74, E.outQuad);
  sounds.push({ t: relT, src: '/lab/clippy/fall-cartoon.mp3' });
  pivot.set(relT, '50% 50%');
  x.to(relT, landT, W + AW, E.linear);
  dy.to(relT, landT, H, E.inQuad);
  rot.set(relT, relRot).to(relT, landT, 540, E.linear);
  say(relT, landT + 900, 'Tell my stapler I loved her!', { fadeOut: 900, replace: true });
  log(relT, "drop: let go at 2.1 px/ms. that's a throw.");
  log(landT, 'clippy.service: Main process exited, code=killed, status=SIGFLING', 'bad');

  // The grave, in the widget gap nearest the edge he left by.
  const deadT = landT + 1800;
  shown.set(landT, 0);
  grave = { t0: deadT, t1: 21400, x: 462 };
  log(deadT, "clippy.service: Failed with result 'signal'.", 'warn');
  cx.to(16900, 17700, 486, E.inOutCubic); cy.to(16900, 17700, 25, E.inOutCubic);
  cimg.set(17550, 'pointer');
  rings.push({ t: 18000, x: 486, y: 25 });
  say(18000, 21000, "It looks like you're grieving. Would you like help with that?", { anchor: 'grave' });
  log(18000, 'grave: poked. epitaph follows.');
  cimg.set(20150, 'default');
  cx.to(20000, 21400, 850, E.inOutCubic); cy.to(20000, 21400, 470, E.inOutCubic);

  // Respawn: lobbed back in from off-screen, face first.
  log(21200, 'clippy.service: Scheduled restart job, restart counter is at 1.', 'sys');
  log(21450, 'Started clippy.service - Inappropriate Clippy.', 'ok');
  const lobT = 21500, lobEnd = lobT + 550;
  play('RestPose', lobT);
  shown.set(lobT, 1);
  x.set(lobT, -AW).to(lobT, lobEnd, 190, E.linear);
  dy.set(lobT, H - SIZE).to(lobT, lobEnd, 0, E.outQuad);
  pivot.set(lobT, '50% 50%');
  rot.set(lobT, 0).to(lobT, lobEnd, 720, E.linear);
  pivot.set(lobEnd, '50% 100%');
  rot.set(lobEnd, 0).to(lobEnd, lobEnd + 110, 82, E.inQuad).to(lobEnd + 560, lobEnd + 860, 0, E.outBack);
  log(lobEnd + 110, 'respawn: lobbed back in from off-screen. landed on his face.');
  const backT = lobEnd + 860;
  const trashEnd = play('EmptyTrash', backT, { exitAt: backT + 1000 });
  say(backT, backT + 3000, 'Reports of my death were, frankly, your fault.');
  window.DURATION = Math.max(trashEnd + 500, backT + 3600);
}

// ---- the journal: -o cat, so it reads the same every loop -----------------
function journalAt(t) {
  const loop = journal.map((j) => j.text);
  const cls = journal.map((j) => j.cls);
  const rows = [];
  for (let k = 0; k < 2; k++) loop.forEach((s, i) => rows.push([s, cls[i], -1]));
  journal.forEach((j) => { if (j.t <= t) rows.push([j.text, j.cls, j.t]); });
  return rows.slice(-6);
}

// ---- render ----------------------------------------------------------------
const els = {};
let lastLines = '';
function render(t) {
  const ax = x.at(t), ady = dy.at(t), arot = rot.at(t);
  els.actor.style.visibility = shown.at(t) ? 'visible' : 'hidden';
  els.actor.style.transformOrigin = pivot.at(t);
  els.actor.style.transform = `translate(${ax}px, ${ady}px) rotate(${arot}deg)`;
  const pos = spriteAt(t);
  els.view.style.visibility = pos ? '' : 'hidden';
  if (pos) els.view.style.backgroundPosition = `${-pos[0]}px ${-pos[1]}px`;

  // Grave: thuds in, fades out.
  if (grave && t >= grave.t0 && t < grave.t1 + 300) {
    const u = clamp((t - grave.t0) / 450, 0, 1);
    const drop = -37 * 0.5 * (1 - E.outBounce(u));
    els.grave.style.display = '';
    els.grave.style.left = `${grave.x}px`;
    els.grave.style.opacity = String(Math.min(clamp((t - grave.t0) / 250, 0, 1), 1 - clamp((t - grave.t1) / 300, 0, 1)));
    els.stone.style.top = `${39 - 37 - 2 + drop}px`;
  } else els.grave.style.display = 'none';

  // Bubble.
  let b = null, prev = null;
  for (const k of bubbles) if (k.t0 <= t) { prev = b; b = k; }
  if (b && t < b.t1 + b.fadeOut) {
    const cont = b.replace || (prev && prev.t1 >= b.t0 - 1);
    const fin = cont ? 1 : clamp((t - b.t0) / 140, 0, 1);
    const fout = t > b.t1 ? 1 - (t - b.t1) / b.fadeOut : 1;
    els.bubble.style.opacity = String(Math.min(fin, fout));
    if (els.btext.textContent !== b.text) els.btext.textContent = b.text;
    const anchor = b.anchor === 'grave' ? grave.x + 23 : clamp(ax + AW / 2, 0, W);
    const bw = els.btext.offsetWidth;
    const left = clamp(anchor - bw / 2, 4, W - bw - 4);
    els.bubble.style.left = `${Math.round(left)}px`;
    const tl = Math.round(clamp(anchor - left - 7, 8, bw - 8 - 14));
    els.tail.style.left = `${tl}px`;
    els.cover.style.left = `${tl + 1.5}px`;
  } else els.bubble.style.opacity = '0';

  // Click ring.
  let r = null;
  for (const k of rings) if (k.t <= t && t < k.t + 420) r = k;
  if (r) {
    const u = (t - r.t) / 420, d = 10 + 34 * E.outCubic(u);
    Object.assign(els.ring.style, { opacity: String(1 - u), width: `${d}px`, height: `${d}px`, left: `${r.x - d / 2}px`, top: `${r.y - d / 2}px` });
  } else els.ring.style.opacity = '0';

  // Cursor.
  const img = cimg.at(t), hot = HOT[img];
  if (els.cursor.dataset.img !== img) { els.cursor.src = `/cursors/${img}.png`; els.cursor.dataset.img = img; }
  els.cursor.style.transform = `translate(${cx.at(t) - hot[0]}px, ${cy.at(t) - hot[1]}px)`;

  // Journal.
  const rows = journalAt(t);
  const key = rows.map((r) => r[0]).join('\n') + '|' + rows.map((r) => (r[2] >= 0 && t - r[2] < 900 ? 1 : 0)).join('');
  if (key !== lastLines) {
    lastLines = key;
    els.lines.innerHTML = '';
    for (const [text, cls, at] of rows) {
      const d = document.createElement('div');
      d.textContent = text;
      if (cls) d.className = cls;
      if (at >= 0 && t - at < 900) d.classList.add('fresh');
      els.lines.appendChild(d);
    }
  }
}
// Adwaita's hotspots at 96 px (/cursors/<name>.json), drawn at 40.
const HOT = { default: [12 * 40 / 96, 4 * 40 / 96], grabbing: [36 * 40 / 96, 20 * 40 / 96], pointer: [28 * 40 / 96, 20 * 40 / 96] };

window.ready = (async () => {
  ANIMS = (await (await fetch('/lab/clippy/agent.json')).json()).animations;
  for (const n of ['actor', 'grave', 'bubble', 'btext', 'ring', 'cursor', 'lines']) els[n] = $(n);
  els.view = els.actor.querySelector('.view');
  els.stone = els.grave.querySelector('.stone');
  els.tail = els.bubble.querySelector('.tail');
  els.cover = els.bubble.querySelector('.cover');
  // Stars, the same every time.
  const rnd = mulberry32(42), wall = $('wall');
  for (let i = 0; i < 70; i++) {
    const s = document.createElement('div');
    s.className = 'star';
    s.style.left = `${rnd() * W}px`;
    s.style.top = `${48 + rnd() * (H - 48)}px`;
    s.style.opacity = String(0.25 + rnd() * 0.6);
    const z = rnd() < 0.15 ? 3 : 2;
    s.style.width = s.style.height = `${z}px`;
    wall.appendChild(s);
  }
  build();
  await Promise.all(['/lab/clippy/map.png', '/cursors/default.png', '/cursors/grabbing.png', '/cursors/pointer.png'].map((src) => {
    const i = new Image(); i.src = src; return i.decode().catch(() => {});
  }));
  await document.fonts.ready;
  render(0);
  window.SOUNDS = sounds;
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
