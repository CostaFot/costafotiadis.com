// Page views per post, from the hit-counter service (which reads them off
// Umami's own table), fetched once per build for the "N views" count on the
// post header and the feed cards. Keys are site paths without a trailing
// slash, the shape the service returns. Fails soft like the beer counts: no
// network, no endpoint, no count, and the build still passes.
import { SITE } from './site';

// VIEWS_API points a local build at a mock; production uses the real service.
export const viewsApi = process.env.VIEWS_API || SITE.viewsApi;

let cache: Promise<Map<string, number>> | undefined;
export function viewCounts(): Promise<Map<string, number>> {
  cache ??= (async () => {
    const counts = new Map<string, number>();
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

// The views of one post as of the build, or undefined when the service did
// not answer (a post it has never seen is 0).
export async function viewsFor(slug: string): Promise<number | undefined> {
  const counts = await viewCounts();
  return counts.size ? counts.get(`/${slug}`) ?? 0 : undefined;
}

export const viewsText = (n: number) => (n === 1 ? '1 view' : `${n.toLocaleString('en-GB')} views`);
