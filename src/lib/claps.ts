// Beer counts from the claps API, fetched once per build for /tag/popular/,
// the popular chip and the "most beers" list in /index.md. Keys are canonical post URLs without
// a trailing slash, which is how Claps.astro posts them. Fails soft: no
// network, no endpoint, no block, and the build still passes.
import type { CollectionEntry } from 'astro:content';
import { SITE, byNewest } from './site';

// CLAPS_API points a local build at a mock; production uses the real API.
const api = process.env.CLAPS_API || SITE.clapsApi;

let cache: Promise<Map<string, number>> | undefined;
export function beerCounts(): Promise<Map<string, number>> {
  cache ??= (async () => {
    const counts = new Map<string, number>();
    try {
      const res = await fetch(`${api}/top?limit=100`, { signal: AbortSignal.timeout(5000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      for (const { url, claps } of (await res.json()) as { url: string; claps: number }[]) counts.set(url, claps);
    } catch (e) {
      console.warn(`[claps] no beer counts (${e instanceof Error ? e.message : e}); the popular block is skipped`);
    }
    return counts;
  })();
  return cache;
}

export interface Popular { post: CollectionEntry<'posts'>; beers: number }

// Every post that may rank, with its beer count from the build snapshot
// (zero when the API has never seen it), most beers first, ties broken by
// date. Only posts count: the API also holds the homepage and a few retired
// URLs. A post with `popular: false` in its frontmatter never ranks, whatever
// its count. /tag/popular/ renders all of these so the browser can re-rank
// them from the live API (see the script there).
export async function rankedPosts(posts: CollectionEntry<'posts'>[]): Promise<Popular[]> {
  const counts = await beerCounts();
  return posts
    .filter((post) => post.data.popular)
    .map((post) => ({ post, beers: counts.get(`${SITE.url}/${post.data.slug}`) ?? 0 }))
    .sort((a, b) => b.beers - a.beers || byNewest(a.post, b.post));
}

// The n posts with the most beers, as of the build.
export async function popularPosts(posts: CollectionEntry<'posts'>[], n = 5): Promise<Popular[]> {
  return (await rankedPosts(posts)).filter((p) => p.beers > 0).slice(0, n);
}
