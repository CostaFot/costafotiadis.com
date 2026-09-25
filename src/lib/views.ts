// Page views per post, from the hit-counter service (which reads them off
// Umami's own table), fetched once per build for the "N views" count on the
// post header and the feed cards. Keys are site paths without a trailing
// slash, the shape the service returns. Fails soft like the beer counts: no
// network, no endpoint, no count, and the build still passes.
//
// A post that started on Medium counts from its Medium reads: Umami only saw
// the tail of those posts' lives, so the count starts from the lifetime reads
// in src/data/medium-claps.json (a snapshot, Medium's reads not its views,
// since a read is someone who got to the end) and Umami adds to it from the
// move on. The Just Eat Takeaway blog posts cross-posted here are in the same
// file and count the same way. The span carries the baseline so the browser
// refresh adds it too.
import { SITE, SHOW_VIEWS } from './site';
import medium from '../data/medium-claps.json';

const MEDIUM_READS = new Map<string, number>(
  (medium.posts as { slug: string | null; reads?: number }[]).filter((p) => p.slug && p.reads).map((p) => [p.slug!, p.reads!]),
);

// Medium's lifetime reads of a post, 0 for one that was never there.
export const mediumReads = (slug: string): number => MEDIUM_READS.get(slug) ?? 0;

// The tooltip on the count, and the aside in the Markdown twin, for a post
// with a Medium baseline; undefined for the rest.
export function mediumNote(slug: string): string | undefined {
  const n = mediumReads(slug);
  return n ? `${n.toLocaleString('en-GB')} of them are reads on Medium, where the post was first published` : undefined;
}

// VIEWS_API points a local build at a mock; production uses the real service.
export const viewsApi = process.env.VIEWS_API || SITE.viewsApi;

let cache: Promise<Map<string, number>> | undefined;
export function viewCounts(): Promise<Map<string, number>> {
  cache ??= (async () => {
    const counts = new Map<string, number>();
    if (!SHOW_VIEWS) return counts;
    try {
      const res = await fetch(`${viewsApi}?limit=1000`, { signal: AbortSignal.timeout(5000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      for (const { path, views } of (await res.json()) as { path: string; views: number }[]) counts.set(path, views);
    } catch (e) {
      console.warn(`[views] no view counts (${e instanceof Error ? e.message : e}); the views are left out`);
    }
    return counts;
  })();
  return cache;
}

// The views of one post as of the build, Medium baseline included, or
// undefined when the service did not answer (a post it has never seen is 0)
// or the views are switched off.
export async function viewsFor(slug: string): Promise<number | undefined> {
  const counts = await viewCounts();
  return counts.size ? (counts.get(`/${slug}`) ?? 0) + mediumReads(slug) : undefined;
}

export const viewsText = (n: number) => (n === 1 ? '1 view' : `${n.toLocaleString('en-GB')} views`);
