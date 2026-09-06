// Pangram's verdict on each post, from src/data/pangram.json (written only by
// scripts/pangram.mjs), for the label under a post's meta line and the line in
// its Markdown twin. The JSON stores the sha256 of the prose that was sent;
// a post whose prose has changed since gets no label and a build warning, the
// same way [claps] warns, so the site still builds.
import type { CollectionEntry } from 'astro:content';
import results from '../data/pangram.json';
import { proseOf, proseHash } from './prose.mjs';

export interface Verdict {
  task: string;
  link: string; // Pangram's public analysis page for this text
  headline: string; // "Fully Human Written", "Lightly AI-Assisted", ...
  prediction_short: string; // Human | Mixed | AI
  fraction_human: number;
  fraction_ai_assisted: number;
  fraction_ai: number;
  model: string;
  version: string;
  words: number;
  hash: string;
  checked: string; // YYYY-MM-DD
}

const RESULTS = results as Record<string, Verdict>;
const cache = new Map<string, Verdict | undefined>();

export function verdictFor(entry: CollectionEntry<'posts'>): Verdict | undefined {
  const slug = entry.data.slug;
  if (cache.has(slug)) return cache.get(slug);
  const v = RESULTS[slug];
  const fresh = v !== undefined && v.hash === proseHash(proseOf(entry.body || ''));
  if (!fresh) console.warn(`[pangram] no verdict for ${slug} (${v ? 'stale' : 'missing'}); run node --env-file=.env scripts/pangram.mjs`);
  cache.set(slug, fresh ? v : undefined);
  return fresh ? v : undefined;
}

const pct = (x: number) => `${Math.round(x * 100)}%`;

// The Markdown twin's line: Pangram's own headline, lowercased to match the meta
// line ("AI" stays). The HTML badge shows prediction_short instead, the one word
// Pangram's own extension draws on a post.
export function verdictLabel(v: Verdict) {
  const text = v.headline.toLowerCase().replace(/\bai\b/g, 'AI');
  return { text, pct: `${pct(v.fraction_human)} human` };
}

// The badge's tooltip. The numbers are in the panel now, so this only says what
// the badge is and that clicking opens it here rather than sending you away.
export function verdictTitle(v: Verdict): string {
  return `Pangram ${v.model} verdict: ${pct(v.fraction_human)} human. Click to find out what that means.`;
}

// The rationale shown in the badge's panel. Costa's words; keep it to a few
// sentences, it sits in a small box.
export const VERDICT_NOTE =
  "I am absolutely done reading AI slop. Pretty sure you are too. To that end, I thought i'd save you time and energy by putting every post here through Pangram's AI-text detector before it goes out. ";

// What was actually sent. Fine print in the panel's footer rather than a
// paragraph of its own, but it stays: a label nobody can scope is worth less.
export const VERDICT_SCOPE = 'prose only';
export const VERDICT_SCOPE_LONG =
  'Only the prose is checked: code blocks, images and link cards are stripped out before the text is sent.';

export const verdictFractions = (v: Verdict) => [
  { key: 'human', label: 'human', value: v.fraction_human },
  { key: 'assisted', label: 'AI-assisted', value: v.fraction_ai_assisted },
  { key: 'ai', label: 'AI-generated', value: v.fraction_ai },
];

export const verdictPct = pct;
