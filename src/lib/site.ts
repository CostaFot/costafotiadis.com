import type { CollectionEntry } from 'astro:content';

export const SITE = {
  title: 'Costa Fotiadis',
  description: 'Professional maker of things',
  url: 'https://www.costafotiadis.com',
  repo: 'https://github.com/CostaFot/costafotiadis.com',
  twitter: '@markasduplicate',
  umami: {
    src: 'https://umami-production-ed35.up.railway.app/script.js',
    websiteId: '0750b48d-d0fe-4958-b48c-2c942efa8b01',
    // Only the real domain reports; the Railway preview host stays out of the stats.
    domains: 'www.costafotiadis.com,costafotiadis.com',
  },
  clapsApi: 'https://claps-api-production.up.railway.app',
  hitCounter: 'https://hit-counter-production.up.railway.app/counter.svg',
  // The same service's per-path pageviews from Umami, for the views count
  // on each post (VIEWS_API overrides it for a local build).
  viewsApi: 'https://hit-counter-production.up.railway.app/views',
  // Buttondown username. The footer form posts straight to Buttondown, no JS;
  // subscribers land on Buttondown's own confirmation page.
  buttondown: 'costafot',
};

// The "N views" count on posts and cards, and the views line in the Markdown
// twins. Off since 2026-09-25 (Costa: hide them for now); flip it to bring
// them back. The footer's visitor counter is separate and stays either way.
export const SHOW_VIEWS = false;

export const SUBSCRIBE_URL = `https://buttondown.com/api/emails/embed-subscribe/${SITE.buttondown}`;

export const NAV = [
  { label: 'Projects', href: '/projects/' },
  { label: 'Lab', href: '/lab/' },
  { label: 'Elsewhere', href: '/elsewhere/' },
  { label: 'Me', href: '/me/' },
];

export const FOOTER = [
  { label: 'Twitter/X', href: 'https://x.com/markasduplicate' },
  { label: 'LinkedIn', href: 'https://www.linkedin.com/in/costafotiadis/' },
  { label: 'GitHub', href: 'https://github.com/CostaFot' },
  { label: 'Things', href: '/things/' },
  { label: 'Stats', href: '/stats/' },
  { label: 'RSS', href: '/rss.xml' },
];

// Top-level paths a post or page slug may never claim. `things` is the feed
// (src/pages/things/); the post about it moved to /building-things/.
// The theme picker's choices, in menu order (ThemeToggle.astro). A skin is a
// choice with a `scheme`: a whole look from src/styles/skins.css, riding on
// that light or dark scheme. Everything that needs the list reads it from
// here: the menu, its script, and the head script in Base.astro that applies
// the saved choice before paint. A new skin is an entry here plus its block in
// skins.css. `icon` is the inside of a 24x24 stroked SVG.
export type Theme = { id: string; label: string; icon: string; scheme?: 'light' | 'dark' };
export const THEMES: Theme[] = [
  { id: 'auto', label: 'auto', icon: '<circle cx="12" cy="12" r="9" /><path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor" stroke="none" />' },
  { id: 'light', label: 'light', icon: '<circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />' },
  { id: 'dark', label: 'dark', icon: '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />' },
  { id: 'geocities', label: 'geocities', scheme: 'dark', icon: '<path d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8z" />' },
  { id: 'win95', label: 'windows 95', scheme: 'light', icon: '<rect x="3" y="4" width="18" height="16" rx="1" /><path d="M3 9h18M15 6.5h1M18 6.5h0" />' },
];
// skin id -> the scheme it rides on
export const SKINS: Record<string, 'light' | 'dark'> = Object.fromEntries(THEMES.filter((t) => t.scheme).map((t) => [t.id, t.scheme!]));

export const RESERVED = new Set(['tag', 'lab', 'stats', 'things', 'rss.xml', 'llms.txt', 'pagefind', 'images', 'files', 'media', 'content', '_astro', '404']);

// Recurring series, read from the title. The eyebrow is the series; the
// headline is what's left after the colon. The mark is the timeline glyph.
const SERIES: { test: RegExp; name: string; mark: string }[] = [
  { test: /^exercises in futility/i, name: 'Exercises in futility', mark: '🫠' },
  { test: /^at the mountains of madness/i, name: 'At the mountains of madness', mark: '🏔️' },
  { test: /^android shorts/i, name: 'Android Shorts', mark: '🩳' },
  { test: /^it looks like you're trying to/i, name: "It looks like you're trying to", mark: '📎' },
];

export function splitTitle(title: string): { series?: string; headline: string; mark: string } {
  for (const s of SERIES) {
    if (!s.test.test(title)) continue;
    const i = title.indexOf(':');
    const headline = i > 0 ? title.slice(i + 1).trim() : title;
    return { series: s.name, headline, mark: s.mark };
  }
  return { headline: title, mark: '●' };
}

export const tagSlug = (t: string) => t.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

// The view-transition name a card's thumbnail shares with its post's hero, so
// the one grows into the other on navigation. Must be a valid CSS ident.
export const heroTransition = (slug: string) => `view-transition-name: pv-${slug.replace(/[^a-z0-9-]/gi, '-')}`;

// A card is "new" (the pulsing timeline dot) this many days after publishing,
// counted from the build, so it goes quiet on the first deploy after that.
export const NEW_DAYS = 14;
export const isNew = (d: Date) => Date.now() - d.getTime() < NEW_DAYS * 86_400_000;

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const fmtDate = (d: Date) => `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
export const fmtMonth = (d: Date) => MONTHS[d.getUTCMonth()];
export const sameDay = (a: Date, b: Date) => a.toISOString().slice(0, 10) === b.toISOString().slice(0, 10);

export function readingTime(body = ''): number {
  const words = body.replace(/```[\s\S]*?```/g, ' ').split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 220));
}

// First real paragraph of the body, de-markdowned, for cards and meta tags
// when the post has no custom excerpt.
export function excerptOf(entry: CollectionEntry<'posts'>): string {
  if (entry.data.excerpt) return entry.data.excerpt;
  const lines = (entry.body || '').split('\n');
  let inFence = false;
  for (const raw of lines) {
    const line = raw.trim();
    if (line.startsWith('```')) { inFence = !inFence; continue; }
    if (inFence || !line || /^(!|#|<|>|\||-|\*\s|\d+\.)/.test(line)) continue;
    const text = line
      .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
      .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
      .replace(/[*_`~]/g, '')
      .trim();
    if (text.length < 20) continue;
    return text.length > 180 ? text.slice(0, 177).replace(/\s+\S*$/, '') + '…' : text;
  }
  return '';
}

export const byNewest = (a: CollectionEntry<'posts'>, b: CollectionEntry<'posts'>) =>
  b.data.date_published.valueOf() - a.data.date_published.valueOf();
