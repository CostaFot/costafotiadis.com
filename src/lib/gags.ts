// The gags on the memes in a post (src/components/gags/, listed in index.ts).
// The memes are flat images, so a gag lays a layer exactly over one and works
// in the image's own pixels: the layer carries --s, the rendered width over
// the natural one. Every gag is an easter egg: its picture gets a badge, the
// post's meta line counts the ones found (kept per page in localStorage), and
// finding them all unlocks a toast, led by the post's `eggs_done` line.

/** The post image or hero whose file is `name` (Astro renames it, the stem survives). */
export const memeImage = (name: string) =>
  document.querySelector<HTMLImageElement>(`.hero img[src*="${name}."], .prose img[src*="${name}."]`);

export const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Lays an element on the picture's content box, whatever border a skin gives
 * it, and keeps it there. Measured off the rects rather than offsetLeft and
 * clientWidth, which round to whole pixels and leave a patch a pixel out at
 * fractional scaling.
 */
export function overlay(img: HTMLImageElement, className: string, naturalWidth: number) {
  const host = img.parentElement!;
  const layer = document.createElement('span');
  layer.className = `gag-layer ${className}`;
  host.append(layer);
  const place = () => {
    const i = img.getBoundingClientRect(), h = host.getBoundingClientRect(), cs = getComputedStyle(img);
    const [t, r, b, l] = ['top', 'right', 'bottom', 'left'].map((s) => parseFloat(cs.getPropertyValue(`border-${s}-width`)) || 0);
    const w = i.width - l - r;
    Object.assign(layer.style, { left: `${i.left - h.left + l}px`, top: `${i.top - h.top + t}px`, width: `${w}px`, height: `${i.height - t - b}px` });
    layer.style.setProperty('--s', String(w / naturalWidth));
  };
  const ro = new ResizeObserver(place);
  ro.observe(host);
  ro.observe(img, { box: 'border-box' });
  place();
  return layer;
}

/** A copy of the picture filling a layer, for gags that zoom or recolour it. */
export function copyOf(img: HTMLImageElement, className: string) {
  const c = new Image(img.width, img.height);
  c.src = img.currentSrc || img.src;
  c.alt = '';
  c.draggable = false;
  c.className = `gag-copy ${className}`;
  return c;
}

/** A canvas filling a layer, sized to it at up to 2x when `fit()` is called. */
export function canvasIn(layer: HTMLElement, naturalWidth: number) {
  const canvas = document.createElement('canvas');
  canvas.className = 'gag-canvas';
  layer.append(canvas);
  const ctx = canvas.getContext('2d')!;
  // Sized when a gag starts, and drawn in the image's own pixels.
  const fit = () => {
    const r = layer.getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(r.width * dpr);
    canvas.height = Math.round(r.height * dpr);
  };
  const clear = () => {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const k = canvas.width / naturalWidth;
    ctx.setTransform(k, 0, 0, k, 0, 0);
  };
  return { canvas, ctx, fit, clear };
}

// ---- the egg hunt ----------------------------------------------------------

const KEY = `eggs:${location.pathname}`;
const DONE = '/gags/yippee.mp3';
const hosts = new Map<string, HTMLElement>();
const found = new Set<string>(
  (() => { try { return JSON.parse(localStorage.getItem(KEY) || '[]') as string[]; } catch { return []; } })(),
);
const counter = document.querySelector<HTMLButtonElement>('.eggs');
const total = Number(counter?.dataset.total) || 0;
const tally = () => [...found].filter((id) => hosts.has(id)).length;

const wiggle = (host: HTMLElement) => {
  if (reducedMotion()) return;
  host.classList.remove('gag-wiggle');
  void host.offsetWidth;
  host.classList.add('gag-wiggle');
};
// Each picture wiggles once the first time it is well in view, until found.
const seen = new IntersectionObserver((entries) => {
  for (const e of entries) if (e.isIntersecting) {
    seen.unobserve(e.target);
    if (!e.target.classList.contains('found')) wiggle(e.target as HTMLElement);
  }
}, { threshold: 0.7 });

const render = () => {
  if (!counter) return;
  const n = tally();
  counter.hidden = false;
  counter.querySelector('.n')!.textContent = String(n);
  counter.classList.toggle('all', n >= total);
};

// The counter takes the reader to the next egg not yet found.
counter?.addEventListener('click', () => {
  const next = [...hosts].filter(([id]) => !found.has(id)).map(([, h]) => h)
    .sort((a, b) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1))[0];
  if (!next) return;
  next.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth', block: 'center' });
  setTimeout(() => wiggle(next), reducedMotion() ? 0 : 500);
});

function toast(text: string) {
  const t = document.createElement('div');
  t.className = 'gag-toast';
  t.setAttribute('role', 'status');
  t.textContent = text;
  document.body.append(t);
  setTimeout(() => t.classList.add('gone'), 4200);
  setTimeout(() => t.remove(), 5000);
}

/**
 * Sets up a gag on the post image `name`: the layer, the badge, the wiggle and
 * the place in the count. `found()` marks it found; the first time the last
 * one is found, the toast.
 */
export function gag(id: string, name: string, naturalWidth: number, className: string) {
  const img = memeImage(name);
  if (!img) return;
  const layer = overlay(img, className, naturalWidth);
  const badge = document.createElement('span');
  badge.className = 'gag-badge';
  badge.setAttribute('aria-hidden', 'true');
  layer.append(badge);
  const host = layer.parentElement!;
  host.classList.add('gag-host');
  host.classList.toggle('found', found.has(id));
  hosts.set(id, host);
  seen.observe(host);
  render();
  return {
    img, layer, host,
    found() {
      host.classList.add('found');
      if (found.has(id)) return;
      found.add(id);
      try { localStorage.setItem(KEY, JSON.stringify([...found])); } catch { /* the count just won't survive a reload */ }
      render();
      if (total && tally() >= total) setTimeout(() => {
        const done = counter?.dataset.done;
        const all = total > 1 ? `all ${total} easter eggs found` : 'easter egg found';
        toast(`🏆 ${done ? `${done} · ${all}` : all[0].toUpperCase() + all.slice(1)}`);
        play(DONE);
      }, 1800);
    },
  };
}

// ---- sound -----------------------------------------------------------------

// One AudioContext for the page, made inside the first click (browsers only
// let a page make sound after one). Files are fetched once the pointer or
// focus first reaches a picture, so a reader who never goes near one never
// downloads them.
let audio: AudioContext | undefined;
const bytes = new Map<string, Promise<ArrayBuffer | undefined>>();
const buffers = new Map<string, Promise<AudioBuffer | undefined>>();

export function prefetch(...urls: string[]) {
  for (const url of urls) if (!bytes.has(url)) bytes.set(url, fetch(url).then((r) => (r.ok ? r.arrayBuffer() : undefined)).catch(() => undefined));
}

/** Prefetches the sounds once the pointer or focus reaches the element. */
export function prefetchOn(el: HTMLElement, ...urls: string[]) {
  const go = () => prefetch(...urls);
  el.addEventListener('pointerenter', go, { once: true });
  el.addEventListener('focusin', go, { once: true });
}

/** The page's AudioContext. Call it from inside the click. */
export function clock() {
  try {
    audio ??= new AudioContext();
    audio.resume().catch(() => {});
    return audio;
  } catch { return undefined; }
}

/**
 * Plays a sound at `at` on the audio clock (now if left out), faded out at
 * `until` if given. A sound that has not decoded by `late` seconds past its
 * start is dropped: a late sting is worse than none.
 */
export async function play(url: string, { at, until, gain = 1, late = 0.4 }: { at?: number; until?: number; gain?: number; late?: number } = {}) {
  const ac = clock();
  if (!ac) return;
  const start = at ?? ac.currentTime;
  prefetch(url);
  if (!buffers.has(url)) buffers.set(url, bytes.get(url)!.then((b) => (b ? ac.decodeAudioData(b) : undefined)).catch(() => undefined));
  const buf = await buffers.get(url)!;
  const now = ac.currentTime;
  if (!buf || now > start + late || (until !== undefined && now > until - 0.25)) return;
  const src = ac.createBufferSource();
  src.buffer = buf;
  const g = ac.createGain();
  g.gain.setValueAtTime(gain, now);
  src.connect(g).connect(ac.destination);
  src.start(Math.max(start, now));
  if (until !== undefined) {
    g.gain.setValueAtTime(gain, until - 0.01);
    g.gain.linearRampToValueAtTime(0, until + 0.03);
    src.stop(until + 0.05);
  }
}

// ---- small maths the canvases share ------------------------------------------

export const TAU = Math.PI * 2;
export const clamp = (v: number) => Math.min(1, Math.max(0, v));
/** How far `t` is from `a` to `b`, 0 to 1. */
export const span = (t: number, a: number, b: number) => clamp((t - a) / (b - a));
export const out3 = (v: number) => 1 - (1 - v) ** 3;
export const rand = (a: number, b: number) => a + Math.random() * (b - a);
