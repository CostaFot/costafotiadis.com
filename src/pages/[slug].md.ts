import { getCollection } from 'astro:content';
import type { APIRoute } from 'astro';
import { entryMarkdown } from '../lib/markdown';
import { elsewhereGroups, featuredIn } from '../lib/elsewhere';
import { verdictFor } from '../lib/pangram';
import { viewsFor } from '../lib/views';

// /<slug>.md next to every /<slug>/ — slug collisions are already rejected by
// [slug].astro. A draft has no twin (server.js falls back to the HTML).
export async function getStaticPaths() {
  const entries = [...(await getCollection('posts', (p) => !p.data.draft)), ...(await getCollection('pages'))];
  return entries.map((entry) => ({ params: { slug: entry.data.slug }, props: { entry } }));
}

export const GET: APIRoute = async ({ props }) => {
  const { entry } = props;
  const featured = entry.collection === 'posts' ? await featuredIn(entry.data.slug) : [];
  const elsewhere = entry.collection === 'pages' && entry.data.elsewhere ? await elsewhereGroups() : [];
  const verdict = entry.collection === 'posts' ? verdictFor(entry) : undefined;
  const views = entry.collection === 'posts' ? await viewsFor(entry.data.slug) : undefined;
  return new Response(entryMarkdown(entry, { featured, elsewhere, verdict, views }), { headers: { 'Content-Type': 'text/markdown; charset=utf-8' } });
};
