// The /elsewhere/ page: where the posts got featured and where Costa turned
// up in person. The list lives in the frontmatter of src/content/pages/elsewhere.md
// (`elsewhere`, one group per kind of venue) so the page and the "featured in"
// line on each post read the same source.
import { getCollection } from 'astro:content';
import type { CollectionEntry } from 'astro:content';

type Page = CollectionEntry<'pages'>;
type Group = NonNullable<Page['data']['elsewhere']>[number];
type Raw = Group['items'][number];

export interface Appearance extends Raw {
  title: string; // the post's title unless the row names its own
  link: string; // the post's URL, or `href` for a row without one
}
export interface AppearanceGroup { name: string; note?: string; items: Appearance[] }

let cache: Promise<AppearanceGroup[]> | undefined;

// Groups in frontmatter order, rows newest first. A `post` that names no
// existing slug fails the build instead of rendering a dead link.
export function elsewhereGroups(): Promise<AppearanceGroup[]> {
  return (cache ??= load());
}

async function load(): Promise<AppearanceGroup[]> {
  const pages = await getCollection('pages');
  const page = pages.find((p) => p.data.elsewhere);
  if (!page) return [];
  const posts = new Map((await getCollection('posts')).map((p) => [p.data.slug, p.data.title]));
  return page.data.elsewhere!.map((g) => ({
    name: g.name,
    note: g.note,
    items: g.items
      .map((a): Appearance => {
        if (a.post && !posts.has(a.post)) throw new Error(`${page.id}: "${a.where}" names post "${a.post}", which does not exist`);
        return { ...a, title: a.title ?? posts.get(a.post!)!, link: a.post ? `/${a.post}/` : a.href };
      })
      .sort((a, b) => b.date.valueOf() - a.date.valueOf()),
  }));
}

// The rows that featured one post, newest first, for its "featured in" line.
// One row per outlet: two Android Developers Blog posts read as one link
// (to the newer), and /elsewhere/ has the full list.
export async function featuredIn(slug: string): Promise<Appearance[]> {
  const groups = await elsewhereGroups();
  const rows = groups.flatMap((g) => g.items.filter((a) => a.post === slug)).sort((a, b) => b.date.valueOf() - a.date.valueOf());
  const seen = new Set<string>();
  return rows.filter((a) => !seen.has(a.where) && seen.add(a.where));
}
