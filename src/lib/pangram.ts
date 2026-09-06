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

export function verdictTitle(v: Verdict): string {
  return `Pangram ${v.model}: ${pct(v.fraction_human)} human, ${pct(v.fraction_ai_assisted)} AI-assisted, ${pct(v.fraction_ai)} AI-generated. Checked ${v.checked} on the prose only (code excluded). Opens the full analysis.`;
}
