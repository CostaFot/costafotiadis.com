import { getCollection } from 'astro:content';
import type { APIRoute } from 'astro';
import { entryMarkdown } from '../lib/markdown';
import { elsewhereGroups, featuredIn } from '../lib/elsewhere';
import { verdictFor } from '../lib/pangram';

// /<slug>.md next to every /<slug>/ — slug collisions are already rejected by [slug].astro.
export async function getStaticPaths() {
  const entries = [...(await getCollection('posts')), ...(await getCollection('pages'))];
  return entries.map((entry) => ({ params: { slug: entry.data.slug }, props: { entry } }));
}

export const GET: APIRoute = async ({ props }) => {
  const { entry } = props;
  const featured = entry.collection === 'posts' ? await featuredIn(entry.data.slug) : [];
  const elsewhere = entry.collection === 'pages' && entry.data.elsewhere ? await elsewhereGroups() : [];
  const verdict = entry.collection === 'posts' ? verdictFor(entry) : undefined;
  return new Response(entryMarkdown(entry, { featured, elsewhere, verdict }), { headers: { 'Content-Type': 'text/markdown; charset=utf-8' } });
};
