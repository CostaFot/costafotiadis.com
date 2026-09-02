import { getCollection } from 'astro:content';
import type { APIRoute } from 'astro';
import { byNewest } from '../lib/site';
import { llmsTxt } from '../lib/markdown';

export const GET: APIRoute = async () => {
  const posts = (await getCollection('posts')).sort(byNewest);
  const pages = await getCollection('pages');
  return new Response(llmsTxt(posts, pages), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
