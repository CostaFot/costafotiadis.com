import type { CollectionEntry } from 'astro:content';

export const SITE = {
  title: 'Costa Fotiadis',
  description: 'Android, most of the time.',
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
  // Buttondown username. The footer form posts straight to Buttondown, no JS;
  // subscribers land on Buttondown's own confirmation page.
  buttondown: 'costafot',
};

export const SUBSCRIBE_URL = `https://buttondown.com/api/emails/embed-subscribe/${SITE.buttondown}`;

export const NAV = [
  { label: 'Projects', href: '/projects/' },
  { label: 'Lab', href: '/lab/' },
  { label: 'Elsewhere', href: '/elsewhere/' },
  { label: 'Stats', href: '/stats/' },
  { label: 'Me', href: '/me/' },
];

export const FOOTER = [
  { label: 'Twitter/X', href: 'https://x.com/markasduplicate' },
  { label: 'LinkedIn', href: 'https://www.linkedin.com/in/costafotiadis/' },
  { label: 'GitHub', href: 'https://github.com/CostaFot' },
  { label: 'Things', href: '/things/' },
  { label: 'RSS', href: '/rss.xml' },
];

// Top-level paths a post or page slug may never claim. `things` is the feed
// (src/pages/things/); the post about it moved to /building-things/.
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
