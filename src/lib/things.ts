// Helpers for the things feed (/things/): the entries in src/content/things.
// Ported from the old CostaFot/things build (src/build.js, src/fetch-meta.js).
import type { CollectionEntry } from 'astro:content';
import path from 'node:path';
import TAGS from '../data/things-tags.json';

export type Thing = CollectionEntry<'things'>;
export type ThingData = Thing['data'];

export const THING_TAGS: Record<string, string> = TAGS;
export const THINGS_INTRO = 'Links, ideas, notes, photos and videos I send myself from my phone. Newest first.';

// Newest first; the id (a UTC stamp) breaks ties.
export const byNewestThing = (a: Thing, b: Thing) =>
  Date.parse(b.data.date) - Date.parse(a.data.date) || (a.data.id < b.data.id ? 1 : -1);

const YT_RE = /(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/))([A-Za-z0-9_-]{11})/;
export const youtubeId = (url: string) => YT_RE.exec(url)?.[1] ?? null;

export function domainOf(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return ''; }
}

export function mark(e: ThingData): string {
  if (e.type === 'idea') return '💡';
  if (e.type === 'note') return '💬';
  if (e.type === 'photo') return '🖼️';
  if (e.type === 'video') return '🎬';
  return youtubeId(e.url || '') ? '▶️' : '🔗';
}

// "2026-08-17T12:29:46+01:00" -> pieces, no timezone maths: the string *is*
// the writer's wall clock.
export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export function parts(date: string) {
  return { y: date.slice(0, 4), m: Number(date.slice(5, 7)) - 1, d: Number(date.slice(8, 10)), hm: date.slice(11, 16), day: date.slice(0, 10) };
}
export const longDay = (date: string) => { const p = parts(date); return `${p.d} ${MONTHS_LONG[p.m]} ${p.y}`; };

// Entries grouped by their literal day, in the order given.
export function byDay(entries: Thing[]): [string, Thing[]][] {
  const days = new Map<string, Thing[]>();
  for (const e of entries) {
    const k = parts(e.data.date).day;
    if (!days.has(k)) days.set(k, []);
    days.get(k)!.push(e);
  }
  return [...days.entries()];
}

// Used tags with counts, most used first.
export function tagCounts(entries: Thing[]): { tag: string; n: number; title: string }[] {
  const counts = new Map<string, number>();
  for (const e of entries) for (const t of e.data.tags) counts.set(t, (counts.get(t) ?? 0) + 1);
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([tag, n]) => ({ tag, n, title: THING_TAGS[tag] }));
}

export const esc = (s: string) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// Escape, then turn bare URLs into links. Runs on already-escaped text so the
// regex only ever sees &amp; for &.
export function richText(s: string): string {
  return esc(s).replace(/https?:\/\/[^\s<]+[^\s<.,;:!?)'"]/g, (u) => {
    const href = u.replace(/&amp;/g, '&');
    return `<a href="${esc(href)}" rel="noopener">${u}</a>`;
  });
}

// The unoptimised original, which server.js serves straight from src/images/.
export const rawImageUrl = (img: { fsPath?: string; src: string }, sub = '') =>
  img.fsPath ? `/images/things/${sub}${path.basename(img.fsPath)}` : img.src;

