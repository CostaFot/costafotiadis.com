import { getCollection } from 'astro:content';
import type { APIRoute } from 'astro';
import { entryMarkdown } from '../lib/markdown';

// /<slug>.md next to every /<slug>/ — slug collisions are already rejected by [slug].astro.
export async function getStaticPaths() {
  const entries = [...(await getCollection('posts')), ...(await getCollection('pages'))];
  return entries.map((entry) => ({ params: { slug: entry.data.slug }, props: { entry } }));
}

export const GET: APIRoute = ({ props }) =>
  new Response(entryMarkdown(props.entry), { headers: { 'Content-Type': 'text/markdown; charset=utf-8' } });
