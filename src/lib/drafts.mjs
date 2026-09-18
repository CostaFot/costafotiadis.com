// The slugs of the posts marked `draft: true`, read straight from the files.
// For the places that run outside Astro's content layer: the sitemap filter
// in astro.config.mjs and the scripts under scripts/.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export const POSTS_DIR = 'src/content/posts';

export function isDraft(md) {
  const fm = md.match(/^---\n([\s\S]*?)\n---/)?.[1] ?? '';
  return /^draft:\s*true\s*$/m.test(fm);
}

export function draftSlugs(dir = POSTS_DIR) {
  const out = new Set();
  for (const f of readdirSync(dir)) {
    if (!f.endsWith('.md')) continue;
    const md = readFileSync(join(dir, f), 'utf8');
    if (!isDraft(md)) continue;
    const slug = md.match(/^slug:\s*(\S+)\s*$/m)?.[1];
    if (slug) out.add(slug);
  }
  return out;
}
